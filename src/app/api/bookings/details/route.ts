import { NextRequest, NextResponse } from 'next/server';
import { getBookingWithDetails } from '@/server/repositories/booking-repo';
import { getInvoiceByBookingId, getInvoiceItems } from '@/server/repositories/invoice-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get('bookingId');

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Missing bookingId' }, { status: 400 });
    }

    const booking = await getBookingWithDetails(bookingId);
    if (!booking) {
      return NextResponse.json({ success: false, error: 'Booking not found' }, { status: 404 });
    }

    const invoice = await getInvoiceByBookingId(bookingId);
    let invoiceItems: unknown[] = [];
    if (invoice) {
      invoiceItems = await getInvoiceItems(invoice.id);
    }

    return NextResponse.json({ success: true, booking, invoice, invoiceItems });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
