import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const supabase = createClient();

    // 1. Fetch Treasury
    const [{ data: invoices }, { data: expenses }, { data: restocks }, { data: products }] = await Promise.all([
      supabase.from("invoices").select("total_amount, payment_method").eq("is_paid", true),
      supabase.from("expenses").select("amount, payment_method"),
      supabase.from("inventory_logs").select("product_id, quantity, purchase_price, payment_method").eq("type", "RESTOCK").gt("quantity", 0),
      supabase.from("products").select("id, stock_quantity"),
    ]);

    let cashIn = 0, bankIn = 0, cashOut = 0, bankOut = 0;
    invoices?.forEach(inv => {
      if (inv.payment_method === "CASH") cashIn += inv.total_amount;
      else bankIn += inv.total_amount;
    });
    expenses?.forEach(exp => {
      if (exp.payment_method === "CASH") cashOut += exp.amount;
      else bankOut += exp.amount;
    });
    restocks?.forEach(r => {
      const cost = r.purchase_price || 0;
      if (r.payment_method === "CASH") cashOut += cost;
      else bankOut += cost;
    });

    const latestCost = new Map<string, number>();
    restocks?.forEach(r => {
      if (r.purchase_price && r.quantity > 0) {
        latestCost.set(r.product_id, r.purchase_price / r.quantity);
      }
    });

    const workingCapital = products?.reduce((sum, p) => {
      const cost = latestCost.get(p.id) || 0;
      return sum + (p.stock_quantity || 0) * cost;
    }, 0) || 0;

    const treasury = {
      cashBalance: cashIn - cashOut,
      bankBalance: bankIn - bankOut,
      workingCapital
    };

    // 2. Fetch Month Data
    const start = format(startOfMonth(selectedDate), "yyyy-MM-dd");
    const end = format(endOfMonth(selectedDate), "yyyy-MM-dd");

    const [{ data: paidInvoices }, { data: monthExpenses }, { data: allRestocks }] = await Promise.all([
      supabase.from("invoices").select(`
        total_amount, created_at,
        invoice_items (
          sale_price, quantity, is_pack_sold,
          products ( id, product_name, is_packable, unit_price, units_per_pack )
        )
      `).eq("is_paid", true)
        .gte("created_at", format(startOfMonth(subMonths(selectedDate, 5)), "yyyy-MM-dd") + "T00:00:00")
        .lte("created_at", end + "T23:59:59"),
      supabase.from("expenses").select("amount, type")
        .gte("expense_date", start).lte("expense_date", end),
      supabase.from("inventory_logs").select("product_id, quantity, purchase_price, created_at")
        .eq("type", "RESTOCK").gt("quantity", 0)
        .order("created_at", { ascending: true }),
    ]);

    const latestMonthCost = new Map<string, number>();
    allRestocks?.forEach(r => { 
      if (r.purchase_price && r.quantity > 0) { 
        latestMonthCost.set(r.product_id, r.purchase_price / r.quantity); 
      } 
    });

    let totalRevenue = 0, productRevenue = 0, productProfit = 0;
    const productMap = new Map<string, any>(); // eslint-disable-line @typescript-eslint/no-explicit-any
    const monthlyRevenue = new Map<string, number>();

    for (let i = 5; i >= 0; i--) {
      monthlyRevenue.set(format(subMonths(selectedDate, i), "MM/yyyy"), 0);
    }

    paidInvoices?.forEach((inv: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const invDate = new Date(inv.created_at);
      const isTargetMonth = format(invDate, "yyyy-MM-dd") >= start;

      if (isTargetMonth) totalRevenue += inv.total_amount;
      let invProdRev = 0;

      inv.invoice_items?.forEach((item: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const itemRev = item.sale_price * item.quantity;
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

      const mk = format(new Date(inv.created_at), "MM/yyyy");
      if (monthlyRevenue.has(mk)) {
        monthlyRevenue.set(mk, (monthlyRevenue.get(mk) || 0) + inv.total_amount);
      }
    });

    const courtRevenue = totalRevenue - productRevenue;

    let fixedExpenses = 0, variableExpenses = 0;
    monthExpenses?.forEach(e => {
      if (e.type === "FIXED") fixedExpenses += e.amount;
      else variableExpenses += e.amount;
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

    // 3. Fetch Inventory
    const { data: lowStockItems } = await supabase
      .from("products")
      .select("id, product_name, stock_quantity")
      .lte("stock_quantity", 10)
      .order("stock_quantity", { ascending: true });

    // 4. Fetch Recent Expenses
    const [{ data: dbExpenses }, { data: dbRestocks }] = await Promise.all([
      supabase
        .from("expenses")
        .select("id, title, amount, type, payment_method, expense_date")
        .gte("expense_date", start).lte("expense_date", end)
        .order("expense_date", { ascending: false })
        .limit(20),
      supabase
        .from("inventory_logs")
        .select("id, purchase_price, reason, created_at, payment_method, products ( product_name )")
        .eq("type", "RESTOCK")
        .gt("purchase_price", 0)
        .gte("created_at", start + "T00:00:00").lte("created_at", end + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const recentExpenses = [
      ...(dbExpenses || []).map((e: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: "exp-" + e.id,
        date: e.expense_date,
        label: e.title || (e.type === "FIXED" ? "Chi phí cố định" : "Chi phí biến động"),
        amount: e.amount,
        category: e.type,
        paymentMethod: e.payment_method || "CASH",
      })),
      ...(dbRestocks || []).map((r: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        id: "rst-" + r.id,
        date: r.created_at,
        label: r.products?.product_name ? `Nhập: ${r.products.product_name}` : (r.reason || "Nhập hàng"),
        amount: r.purchase_price,
        category: "RESTOCK",
        paymentMethod: r.payment_method || "CASH",
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      treasury,
      monthMetrics,
      chartData,
      topProducts,
      lowStockItems: lowStockItems || [],
      recentExpenses
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
