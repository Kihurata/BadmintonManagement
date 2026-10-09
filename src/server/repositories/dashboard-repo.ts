import { createClient } from '@/utils/supabase/server';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { RecentExpenseItem } from '@/components/dashboard/recent-expenses';

export type { RecentExpenseItem };

export interface Treasury {
  cashBalance: number;
  bankBalance: number;
  totalBalance: number;
  workingCapital: number;
}

export interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  profit: number;
  margin: number;
}

export interface MonthMetrics {
  totalRevenue: number;
  courtRevenue: number;
  productRevenue: number;
  productProfit: number;
  fixedExpenses: number;
  variableExpenses: number;
  netProfit: number;
}

export interface LowStockItem {
  id: string;
  product_name: string;
  stock_quantity: number;
}

export interface DashboardChartPoint {
  name: string;
  fullDate: string;
  total: number;
}

export interface DashboardData {
  tenantId: string;
  treasury: Treasury;
  monthMetrics: MonthMetrics;
  chartData: DashboardChartPoint[];
  topProducts: TopProduct[];
  lowStockItems: LowStockItem[];
  recentExpenses: RecentExpenseItem[];
}

export async function getDashboardData(selectedDate: Date = new Date()): Promise<DashboardData> {
  const supabase = createClient();

  const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
  const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");
  const fiveMonthsAgoStart = format(startOfMonth(subMonths(selectedDate, 5)), "yyyy-MM-dd");

  const [
    { data: balanceData },
    { data: productsData },
    { data: restocksData },
    { data: historicalInvoices },
    { data: currentMonthInvoices },
    { data: opTransactions }
  ] = await Promise.all([
    // 1. Tenant Balances O(1) lookup
    supabase
      .from("tenant_balances")
      .select("cash_balance, bank_balance, tenant_id")
      .maybeSingle(),

    // 2. Products (combined for working capital and low stock items)
    supabase
      .from("products")
      .select("id, product_name, stock_quantity, unit_price")
      .order("stock_quantity", { ascending: true }),

    // 3. Recent Restock Cost Map (latest 200 restocks to avoid unbounded table scan)
    supabase
      .from("inventory_logs")
      .select("product_id, quantity, purchase_price")
      .eq("type", "RESTOCK")
      .gt("quantity", 0)
      .order("created_at", { ascending: false })
      .limit(200),

    // 4. Historical Invoices for 6-Month Chart (totals only, no deep joins)
    supabase
      .from("invoices")
      .select("total_amount, created_at")
      .or("status.eq.PAID,is_paid.eq.true")
      .gte("created_at", fiveMonthsAgoStart + "T00:00:00")
      .lte("created_at", end + "T23:59:59"),

    // 5. Target Month Invoices with items (scoped strictly to target month)
    supabase
      .from("invoices")
      .select(`
        total_amount,
        created_at,
        invoice_items (
          sale_price,
          quantity,
          is_pack_sold,
          products ( id, product_name, is_packable, unit_price, units_per_pack )
        )
      `)
      .or("status.eq.PAID,is_paid.eq.true")
      .gte("created_at", start + "T00:00:00")
      .lte("created_at", end + "T23:59:59"),

    // 6. Target Month Expenses (used for both P&L and recent expenses list)
    supabase
      .from("transactions")
      .select("id, description, amount, category, payment_method, transaction_date")
      .in("category", ["FIXED_EXPENSE", "VARIABLE_EXPENSE"])
      .gte("transaction_date", start + "T00:00:00")
      .lte("transaction_date", end + "T23:59:59")
      .order("transaction_date", { ascending: false })
  ]);

  // --- Treasury Calculations ---
  const cashBalance = balanceData?.cash_balance != null ? Number(balanceData.cash_balance) : 0;
  const bankBalance = balanceData?.bank_balance != null ? Number(balanceData.bank_balance) : 0;
  const tenantId = balanceData?.tenant_id || "00000000-0000-0000-0000-000000000000";

  // Build latest cost map from restocks
  const latestCost = new Map<string, number>();
  // Process backwards from oldest in batch to newest so newest overwrites
  const reversedRestocks = (restocksData || []).slice().reverse();
  for (const r of reversedRestocks) {
    if (r.purchase_price && r.quantity > 0) {
      latestCost.set(r.product_id, Number(r.purchase_price) / r.quantity);
    }
  }

  const allProducts = productsData || [];
  const workingCapital = allProducts.reduce((sum, p) => {
    const cost = latestCost.get(p.id) || Number(p.unit_price || 0) * 0.7; // fallback to 70% of retail if no restock recorded
    return sum + (p.stock_quantity || 0) * cost;
  }, 0);

  const treasury: Treasury = {
    cashBalance,
    bankBalance,
    totalBalance: cashBalance + bankBalance,
    workingCapital
  };

  // --- Low Stock Items ---
  const lowStockItems: LowStockItem[] = allProducts
    .filter(p => (p.stock_quantity || 0) <= 10)
    .map(p => ({
      id: p.id,
      product_name: p.product_name,
      stock_quantity: p.stock_quantity || 0
    }));

  // --- 6-Month Chart Data ---
  const monthlyRevenue = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    monthlyRevenue.set(format(subMonths(selectedDate, i), "MM/yyyy"), 0);
  }

  (historicalInvoices || []).forEach((inv) => {
    const mk = format(new Date(inv.created_at), "MM/yyyy");
    if (monthlyRevenue.has(mk)) {
      monthlyRevenue.set(mk, (monthlyRevenue.get(mk) || 0) + Number(inv.total_amount || 0));
    }
  });

  const chartData: DashboardChartPoint[] = Array.from(monthlyRevenue.entries()).map(([name, total]) => ({
    name: name.split("/")[0],
    fullDate: name,
    total
  }));

  // --- Target Month Metrics & Top Products ---
  let totalRevenue = 0;
  let productRevenue = 0;
  let productProfit = 0;
  const productMap = new Map<string, TopProduct>();

  (currentMonthInvoices || []).forEach((inv) => {
    const invAmount = Number(inv.total_amount || 0);
    totalRevenue += invAmount;
    let invProdRev = 0;

    const items = inv.invoice_items as unknown as Array<{
      sale_price: number;
      quantity: number;
      is_pack_sold?: boolean;
      products?: {
        id: string;
        product_name: string;
        is_packable?: boolean;
        unit_price?: number;
        units_per_pack?: number | null;
      } | Array<{
        id: string;
        product_name: string;
        is_packable?: boolean;
        unit_price?: number;
        units_per_pack?: number | null;
      }> | null;
    }> | null;

    items?.forEach((item) => {
      const itemRev = Number(item.sale_price) * item.quantity;
      invProdRev += itemRev;

      const p = Array.isArray(item.products) ? item.products[0] : item.products;
      if (p) {
        const unitCost = latestCost.get(p.id) || (Number(p.unit_price || 0) * 0.7);
        const isPack = item.is_pack_sold === true;
        const unitsPerPack = p.units_per_pack || 1;
        const unitsConsumed = isPack ? item.quantity * unitsPerPack : item.quantity;
        const itemCogs = unitCost * unitsConsumed;
        const itemProfit = itemRev - itemCogs;

        const cur = productMap.get(p.id) || {
          id: p.id,
          name: p.product_name,
          sales: 0,
          revenue: 0,
          profit: 0,
          margin: 0
        };

        const newRevenue = cur.revenue + itemRev;
        const newProfit = cur.profit + itemProfit;

        productMap.set(p.id, {
          ...cur,
          sales: cur.sales + unitsConsumed,
          revenue: newRevenue,
          profit: newProfit,
          margin: newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0
        });

        productProfit += itemProfit;
      }
    });

    productRevenue += invProdRev;
  });

  const courtRevenue = totalRevenue - productRevenue;

  let fixedExpenses = 0;
  let variableExpenses = 0;
  const recentExpenses: RecentExpenseItem[] = [];

  (opTransactions || []).forEach((t) => {
    const amt = Number(t.amount || 0);
    if (t.category === "FIXED_EXPENSE") {
      fixedExpenses += amt;
    } else {
      variableExpenses += amt;
    }

    if (recentExpenses.length < 20) {
      recentExpenses.push({
        id: "tx-" + t.id,
        date: t.transaction_date,
        label: t.description || (t.category === "FIXED_EXPENSE" ? "Chi phí cố định" : "Chi phí biến động"),
        amount: amt,
        category: (t.category as RecentExpenseItem['category']) || "FIXED_EXPENSE",
        paymentMethod: (t.payment_method as RecentExpenseItem['paymentMethod']) || "CASH"
      });
    }
  });

  const netProfit = courtRevenue + productProfit - fixedExpenses - variableExpenses;

  const monthMetrics: MonthMetrics = {
    totalRevenue,
    courtRevenue,
    productRevenue,
    productProfit,
    fixedExpenses,
    variableExpenses,
    netProfit
  };

  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return {
    tenantId,
    treasury,
    monthMetrics,
    chartData,
    topProducts,
    lowStockItems,
    recentExpenses
  };
}
