import { createClient } from '@/utils/supabase/server';
import { calculateRentalFee } from '@/lib/pricing';

export interface Invoice {
  id: string;
  booking_id: string | null;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  is_paid: boolean;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  quantity: number;
  sale_price: number;
  is_pack_sold: boolean;
  products?: {
    product_name: string;
    base_unit: string | null;
    pack_unit: string | null;
  } | null;
}

export async function getInvoiceByBookingId(bookingId: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching invoice by booking ID:', error);
    return null;
  }
  return data;
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*, products (product_name, base_unit, pack_unit)')
    .eq('invoice_id', invoiceId);

  if (error) {
    console.error('Error fetching invoice items:', error);
    return [];
  }
  return data as any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function addInvoiceItem(
  invoiceId: string,
  productId: string,
  quantity: number,
  salePrice: number,
  isPackSold: boolean,
  invoiceTotalAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // 1. Insert item
  const { error: insertError } = await supabase
    .from('invoice_items')
    .insert([{
      invoice_id: invoiceId,
      product_id: productId,
      quantity,
      sale_price: salePrice,
      is_pack_sold: isPackSold
    }]);

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 2. Update Invoice Total
  const newTotal = invoiceTotalAmount + (salePrice * quantity);
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ total_amount: newTotal })
    .eq('id', invoiceId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function updateInvoiceItemQuantity(
  itemId: string,
  invoiceId: string,
  newQty: number,
  delta: number,
  salePrice: number,
  invoiceTotalAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // 1. Update item quantity
  const { error: itemError } = await supabase
    .from('invoice_items')
    .update({ quantity: newQty })
    .eq('id', itemId);

  if (itemError) {
    return { success: false, error: itemError.message };
  }

  // 2. Update Invoice Total
  const newTotal = invoiceTotalAmount + (delta * salePrice);
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ total_amount: newTotal })
    .eq('id', invoiceId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function removeInvoiceItem(
  itemId: string,
  invoiceId: string,
  productId: string,
  quantity: number,
  salePrice: number,
  isPackSold: boolean,
  deduct: number,
  invoiceTotalAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  // 1. Delete item
  const { error: deleteError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('id', itemId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  // 2. Update Invoice Total
  const newTotal = invoiceTotalAmount - (salePrice * quantity);
  const { error: updateError } = await supabase
    .from('invoices')
    .update({ total_amount: newTotal })
    .eq('id', invoiceId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 3. Restore Inventory (RETURN log)
  const restoreQty = quantity * deduct;
  const { error: logError } = await supabase
    .from('inventory_logs')
    .insert([{
      product_id: productId,
      type: 'RETURN',
      quantity: restoreQty,
      reason: `Xóa khỏi HĐ #${invoiceId.slice(0, 6)}`
    }]);

  if (logError) {
    console.error('Error logging return:', logError);
  }

  // 4. Update Product stock
  const { data: prod, error: prodError } = await supabase
    .from('products')
    .select('stock_quantity')
    .eq('id', productId)
    .single();

  if (prodError || !prod) {
    console.error('Error fetching product for restore:', prodError);
  } else {
    const { error: stockError } = await supabase
      .from('products')
      .update({ stock_quantity: prod.stock_quantity + restoreQty })
      .eq('id', productId);

    if (stockError) {
      console.error('Error restoring stock:', stockError);
    }
  }

  return { success: true };
}

export async function payInvoice(
  invoiceId: string,
  totalAmount: number,
  paymentMethod: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('invoices')
    .update({
      total_amount: totalAmount,
      payment_method: paymentMethod,
      is_paid: true
    })
    .eq('id', invoiceId);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function createInvoice(
  bookingId: string | null,
  customerId: string,
  totalAmount: number,
  paymentMethod: string,
  isPaid: boolean
): Promise<{ success: boolean; data?: Invoice; error?: string }> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .insert([{
      booking_id: bookingId,
      customer_id: customerId,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      is_paid: isPaid
    }])
    .select()
    .single();

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true, data };
}

export async function createInvoiceItems(
  items: Array<{
    invoice_id: string;
    product_id: string;
    quantity: number;
    sale_price: number;
    is_pack_sold: boolean;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('invoice_items')
    .insert(items);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function addExpense(
  title: string,
  type: 'FIXED' | 'VARIABLE',
  amount: number,
  expenseDate: string,
  note: string | null,
  paymentMethod: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('expenses')
    .insert([
      {
        title,
        type,
        amount,
        expense_date: expenseDate,
        note,
        payment_method: paymentMethod
      }
    ]);

  if (error) {
    return { success: false, error: (error as Error).message };
  }
  return { success: true };
}

export async function getInvoiceDetails(invoiceId: string): Promise<any | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customers ( name, phone, type ),
      bookings (
        start_time, end_time,
        total_court_fee, overtime_fee, deposit_amount,
        courts ( court_name )
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    console.error('Error fetching invoice details:', error);
    return null;
  }
  return data;
}

export async function getUnpaidInvoices(): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      total_amount,
      paid_amount,
      created_at,
      is_paid,
      customer_id,
      customers ( name, phone ),
      bookings (
        courts ( court_name ),
        start_time,
        end_time
      ),
      invoice_items ( sale_price, quantity )
    `)
    .eq('is_paid', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching unpaid invoices:', error);
    return [];
  }
  return data;
}

export async function getInvoicesInDateRange(startDate: string, endDate: string): Promise<any[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const supabase = createClient();
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      id,
      total_amount,
      created_at,
      is_paid,
      customers ( name ),
      bookings (
        courts ( court_name ),
        start_time,
        end_time
      ),
      invoice_items ( sale_price, quantity )
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices in date range:', error);
    return [];
  }
  return data;
}

export async function prepayRecurringBookings(
  ruleId: string,
  paymentMethod: string
): Promise<{ success: boolean; prepayCount: number; error?: string }> {
  const supabase = createClient();

  // 1. Fetch recurring rule with joined court and customer
  const { data: rule, error: ruleError } = await supabase
    .from('recurring_rules')
    .select('*, courts(*), customers(*)')
    .eq('id', ruleId)
    .single();

  if (ruleError || !rule) {
    return { success: false, prepayCount: 0, error: ruleError?.message || 'Recurring rule not found.' };
  }

  // 2. Fetch all bookings for this rule (excluding CANCELLED)
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('*, invoices(*)')
    .eq('recurring_rule_id', ruleId)
    .neq('status', 'CANCELLED');

  if (bookingsError || !bookings) {
    return { success: false, prepayCount: 0, error: bookingsError?.message || 'Bookings not found.' };
  }

  let prepayCount = 0;
  const court = rule.courts;
  const customerType = rule.customers?.type || 'GUEST';

  // 3. Process bookings
  for (const booking of bookings) {
    const invoice = Array.isArray(booking.invoices) ? booking.invoices[0] : booking.invoices;

    if (!invoice) {
      // No invoice exists. Calculate rental fee and create paid invoice.
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      const pricing = calculateRentalFee(start, end, court, customerType);

      const { error: insertError } = await supabase
        .from('invoices')
        .insert([{
          booking_id: booking.id,
          customer_id: rule.customer_id,
          total_amount: pricing.rentalFee,
          paid_amount: pricing.rentalFee,
          payment_method: paymentMethod,
          is_paid: true
        }]);

      if (insertError) {
        return { success: false, prepayCount, error: insertError.message };
      }
      prepayCount++;
    } else if (!invoice.is_paid) {
      // Existing unpaid invoice. Mark as paid.
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          is_paid: true,
          paid_amount: invoice.total_amount,
          payment_method: paymentMethod
        })
        .eq('id', invoice.id);

      if (updateError) {
        return { success: false, prepayCount, error: updateError.message };
      }
      prepayCount++;
    }
  }

  return { success: true, prepayCount };
}

