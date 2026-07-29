import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { unstable_cache } from 'next/cache';

function getAnonSupabaseClient(token?: string) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );
}

// Tier 1: Restock Cost Map (Cache TTL: 30 minutes)
const getRestockCostsCache = unstable_cache(
  async (token: string) => {
    const supabase = getAnonSupabaseClient(token);
    const { data: restocks } = await supabase
      .from("inventory_logs")
      .select("product_id, quantity, purchase_price")
      .eq("type", "RESTOCK")
      .gt("quantity", 0)
      .order("created_at", { ascending: true });

    const costMap = new Map<string, number>();
    restocks?.forEach(r => {
      if (r.purchase_price && r.quantity > 0) {
        costMap.set(r.product_id, Number(r.purchase_price) / r.quantity);
      }
    });
    return Array.from(costMap.entries());
  },
  ['inventory-restock-costs-map'],
  { tags: ['inventory:restock-costs'], revalidate: 1800 }
);

// Tier 2: Monthly Financial Metrics & Trend (Cache TTL: 60 seconds)
const getMonthMetricsCache = unstable_cache(
  async (monthKey: string, token: string) => {
    // Construct anchor date from monthKey ("yyyy-MM")
    const selectedDate = new Date(`${monthKey}-01T00:00:00`);
    const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
    const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");
    const fiveMonthsAgoStart = format(startOfMonth(subMonths(selectedDate, 5)), "yyyy-MM-dd");

    const supabase = getAnonSupabaseClient(token);

    // Fetch cached restock cost map
    const costEntries = await getRestockCostsCache(token);
    const latestMonthCost = new Map<string, number>(costEntries);

    const [{ data: paidInvoices }, { data: opTransactions }] = await Promise.all([
      supabase.from("invoices").select(`
        total_amount, created_at,
        invoice_items (
          sale_price, quantity, is_pack_sold,
          products ( id, product_name, is_packable, unit_price, units_per_pack )
        )
      `).or("status.eq.PAID,is_paid.eq.true")
        .gte("created_at", fiveMonthsAgoStart + "T00:00:00")
        .lte("created_at", end + "T23:59:59"),
      supabase.from("transactions")
        .select("amount, category, payment_method, transaction_date, description")
        .in("category", ["FIXED_EXPENSE", "VARIABLE_EXPENSE"])
        .gte("transaction_date", start + "T00:00:00")
        .lte("transaction_date", end + "T23:59:59"),
    ]);

    let totalRevenue = 0, productRevenue = 0, productProfit = 0;
    const productMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const monthlyRevenue = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      monthlyRevenue.set(format(subMonths(selectedDate, i), "MM/yyyy"), 0);
    }

    paidInvoices?.forEach((inv: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const invDate = new Date(inv.created_at);
      const isTargetMonth = format(invDate, "yyyy-MM-dd") >= start;

      const invAmount = Number(inv.total_amount || 0);
      if (isTargetMonth) totalRevenue += invAmount;
      let invProdRev = 0;

      inv.invoice_items?.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const itemRev = Number(item.sale_price) * item.quantity;
        if (isTargetMonth) invProdRev += itemRev;

        if (item.products) {
          const p = item.products;
          const unitCost = latestMonthCost.get(p.id) || 0;
          const isPack = item.is_pack_sold === true;
          const unitsPerPack = p.units_per_pack || 1;
          const unitsConsumed = isPack ? item.quantity * unitsPerPack : item.quantity;
          const itemCogs = unitCost * unitsConsumed;
          const itemProfit = itemRev - itemCogs;

          if (isTargetMonth) {
            const cur = productMap.get(p.id) || { id: p.id, name: p.product_name, sales: 0, revenue: 0, profit: 0, margin: 0 };
            const newRevenue = cur.revenue + itemRev;
            const newProfit = cur.profit + itemProfit;
            productMap.set(p.id, {
              ...cur,
              sales: cur.sales + unitsConsumed,
              revenue: newRevenue,
              profit: newProfit,
              margin: newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0,
            });

            productProfit += itemProfit;
          }
        }
      });
      if (isTargetMonth) productRevenue += invProdRev;

      const mk = format(invDate, "MM/yyyy");
      if (monthlyRevenue.has(mk)) {
        monthlyRevenue.set(mk, (monthlyRevenue.get(mk) || 0) + invAmount);
      }
    });

    const courtRevenue = totalRevenue - productRevenue;

    let fixedExpenses = 0, variableExpenses = 0;
    opTransactions?.forEach(t => {
      const amt = Number(t.amount || 0);
      if (t.category === "FIXED_EXPENSE") fixedExpenses += amt;
      else variableExpenses += amt;
    });

    const netProfit = courtRevenue + productProfit - fixedExpenses - variableExpenses;

    const monthMetrics = {
      totalRevenue,
      courtRevenue,
      productRevenue,
      productProfit,
      fixedExpenses,
      variableExpenses,
      netProfit
    };

    const chartData = Array.from(monthlyRevenue.entries()).map(([name, total]) => ({
      name: name.split("/")[0],
      fullDate: name,
      total,
    }));

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    return { monthMetrics, chartData, topProducts };
  },
  ['dashboard-month-metrics-key'],
  { tags: ['dashboard:current-month'], revalidate: 60 }
);

export async function GET(req: NextRequest) {
  try {
    const serverSupabase = createServerClient();
    const { data: { session } } = await serverSupabase.auth.getSession();
    const token = session?.access_token || '';

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam ? new Date(dateParam) : new Date();
    const monthKey = format(selectedDate, "yyyy-MM");
    const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
    const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");

    const supabase = getAnonSupabaseClient(token);

    // Parallel Execution: Real-time queries + Cached Tier Queries
    const [
      { data: balanceData },
      { data: products },
      costEntries,
      monthMetricsData,
      { data: lowStockItems },
      { data: recentTransactions }
    ] = await Promise.all([
      supabase.from("tenant_balances").select("cash_balance, bank_balance, tenant_id").maybeSingle(),
      supabase.from("products").select("id, stock_quantity"),
      getRestockCostsCache(token),
      getMonthMetricsCache(monthKey, token),
      supabase.from("products").select("id, product_name, stock_quantity").lte("stock_quantity", 10).order("stock_quantity", { ascending: true }),
      supabase.from("transactions").select("id, description, amount, category, payment_method, transaction_date").eq("type", "EXPENSE").gte("transaction_date", start + "T00:00:00").lte("transaction_date", end + "T23:59:59").order("transaction_date", { ascending: false }).limit(20)
    ]);

    const cashBalance = balanceData?.cash_balance != null ? Number(balanceData.cash_balance) : 0;
    const bankBalance = balanceData?.bank_balance != null ? Number(balanceData.bank_balance) : 0;
    const tenantId = balanceData?.tenant_id || "00000000-0000-0000-0000-000000000000";

    const latestCost = new Map<string, number>(costEntries);
    const workingCapital = products?.reduce((sum, p) => {
      const cost = latestCost.get(p.id) || 0;
      return sum + (p.stock_quantity || 0) * cost;
    }, 0) || 0;

    const treasury = {
      cashBalance,
      bankBalance,
      totalBalance: cashBalance + bankBalance,
      workingCapital
    };

    const recentExpenses = (recentTransactions || []).map((t: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      id: "tx-" + t.id,
      date: t.transaction_date,
      label: t.description || (t.category === "FIXED_EXPENSE" ? "Chi phí cố định" : "Chi phí biến động"),
      amount: Number(t.amount),
      category: t.category,
      paymentMethod: t.payment_method || "CASH",
    }));

    return NextResponse.json({
      success: true,
      tenantId,
      treasury,
      monthMetrics: monthMetricsData.monthMetrics,
      chartData: monthMetricsData.chartData,
      topProducts: monthMetricsData.topProducts,
      lowStockItems: lowStockItems || [],
      recentExpenses
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

