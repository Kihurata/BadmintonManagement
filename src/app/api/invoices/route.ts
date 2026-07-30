import { NextRequest, NextResponse } from 'next/server';
import {
  getInvoiceDetails,
  getInvoiceItems,
  getUnpaidInvoices,
  getInvoicesInDateRange,
  payInvoice
} from '@/server/repositories/invoice-repo';
import { revalidateTag } from 'next/cache';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('invoiceId');
    const unpaid = searchParams.get('unpaid');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (invoiceId) {
      const invoice = await getInvoiceDetails(invoiceId);
      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }
      const items = await getInvoiceItems(invoiceId);
      return NextResponse.json({ success: true, invoice, items });
    }

    if (unpaid === 'true') {
      const invoices = await getUnpaidInvoices();
      return NextResponse.json({ success: true, data: invoices });
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const invoices = await getInvoicesInDateRange(start.toISOString(), end.toISOString());
      return NextResponse.json({ success: true, data: invoices });
    }

    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { invoiceId, paymentMethod, totalAmount } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ success: false, error: 'Missing invoiceId' }, { status: 400 });
    }

    let finalTotalAmount = totalAmount;
    if (finalTotalAmount === undefined) {
      const invoice = await getInvoiceDetails(invoiceId);
      if (!invoice) {
        return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
      }
      finalTotalAmount = invoice.total_amount;
    }

    const result = await payInvoice(invoiceId, finalTotalAmount, paymentMethod || 'CASH');
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    try {
      revalidateTag('dashboard:current-month');
    } catch (e) {
      console.warn('revalidateTag failed:', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
