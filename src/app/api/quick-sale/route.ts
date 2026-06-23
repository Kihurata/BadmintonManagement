import { NextRequest, NextResponse } from 'next/server';
import { createInvoice, createInvoiceItems } from '@/server/repositories/invoice-repo';
import { getOrCreateGuestCustomer } from '@/server/repositories/product-repo';

export async function POST(req: NextRequest) {
  try {
    const { customerId, totalAmount, paymentMethod, cartItems } = await req.json();

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Giỏ hàng trống. Vui lòng chọn sản phẩm.' }, { status: 400 });
    }

    // 1. Resolve Customer ID
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      const guest = await getOrCreateGuestCustomer();
      finalCustomerId = guest.id;
    }

    // 2. Create Invoice
    const invoiceRes = await createInvoice(null, finalCustomerId, totalAmount, paymentMethod, true);
    if (!invoiceRes.success || !invoiceRes.data) {
      return NextResponse.json({ success: false, error: invoiceRes.error || 'Failed to create invoice' }, { status: 500 });
    }

    const newInvoice = invoiceRes.data;

    // 3. Create Invoice Items
    const itemsToInsert = cartItems.map((item: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      invoice_id: newInvoice.id,
      product_id: item.productId,
      quantity: item.quantity,
      sale_price: item.price,
      is_pack_sold: item.isPack
    }));

    const itemsRes = await createInvoiceItems(itemsToInsert);
    if (!itemsRes.success) {
      return NextResponse.json({ success: false, error: itemsRes.error || 'Failed to create invoice items' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
