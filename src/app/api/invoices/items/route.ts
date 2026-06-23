import { NextRequest, NextResponse } from 'next/server';
import { addInvoiceItem, updateInvoiceItemQuantity, removeInvoiceItem } from '@/server/repositories/invoice-repo';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, productId, quantity, salePrice, isPackSold, invoiceTotalAmount } = await req.json();

    if (!invoiceId || !productId || !quantity || !salePrice) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const res = await addInvoiceItem(invoiceId, productId, quantity, salePrice, isPackSold, invoiceTotalAmount);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { itemId, invoiceId, newQty, delta, salePrice, invoiceTotalAmount } = await req.json();

    if (!itemId || !invoiceId || typeof newQty !== 'number' || typeof delta !== 'number' || !salePrice) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const res = await updateInvoiceItemQuantity(itemId, invoiceId, newQty, delta, salePrice, invoiceTotalAmount);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { itemId, invoiceId, productId, quantity, salePrice, isPackSold, deduct, invoiceTotalAmount } = await req.json();

    if (!itemId || !invoiceId || !productId || !quantity || !salePrice) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const res = await removeInvoiceItem(itemId, invoiceId, productId, quantity, salePrice, isPackSold, deduct || 1, invoiceTotalAmount);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
