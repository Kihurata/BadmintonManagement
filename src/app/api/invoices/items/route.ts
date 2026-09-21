import { NextRequest, NextResponse } from 'next/server';
import { addInvoiceItem, updateInvoiceItemQuantity, removeInvoiceItem } from '@/server/repositories/invoice-repo';
import { z } from 'zod';

const addInvoiceItemSchema = z.object({
  invoiceId: z.string(),
  productId: z.string(),
  quantity: z.coerce.number().int().positive(),
  salePrice: z.coerce.number().nonnegative(),
  isPackSold: z.coerce.boolean().default(false),
  allocationType: z.enum(['SHARED', 'INDIVIDUAL']).nullable().optional(),
  assignedMemberId: z.string().nullable().optional(),
  invoiceTotalAmount: z.coerce.number().nonnegative().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Validate using Zod
    const validation = addInvoiceItemSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // 2. Validate allocation integrity
    const { allocationType, assignedMemberId } = validation.data;
    if (allocationType === 'INDIVIDUAL' && !assignedMemberId) {
      return NextResponse.json({ success: false, error: 'Missing assigned member ID' }, { status: 400 });
    }

    // 3. Call repository with validated data
    const res = await addInvoiceItem(validation.data);
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
