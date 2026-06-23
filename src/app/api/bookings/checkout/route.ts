import { NextRequest, NextResponse } from 'next/server';
import { completeBooking } from '@/server/repositories/booking-repo';
import { payInvoice, createInvoice, getInvoiceByBookingId } from '@/server/repositories/invoice-repo';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, actualEndTime, overtimeFee, rentalFee, totalAmount, paymentMethod, customerId } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Missing bookingId' }, { status: 400 });
    }

    // 1. Complete Booking
    const bookingRes = await completeBooking(bookingId, actualEndTime, overtimeFee, rentalFee);
    if (!bookingRes.success) {
      return NextResponse.json({ success: false, error: bookingRes.error }, { status: 500 });
    }

    // 2. Handle Invoice
    const existingInvoice = await getInvoiceByBookingId(bookingId);
    if (existingInvoice) {
      const invoiceRes = await payInvoice(existingInvoice.id, totalAmount, paymentMethod);
      if (!invoiceRes.success) {
        return NextResponse.json({ success: false, error: invoiceRes.error }, { status: 500 });
      }
    } else {
      // Create new invoice for legacy booking
      const invoiceRes = await createInvoice(bookingId, customerId, totalAmount, paymentMethod, true);
      if (!invoiceRes.success) {
        return NextResponse.json({ success: false, error: invoiceRes.error }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
