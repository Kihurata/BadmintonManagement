import { NextRequest, NextResponse } from 'next/server';
import { checkInBooking } from '@/server/repositories/booking-repo';

export async function POST(req: NextRequest) {
  try {
    const { bookingId, customerId, rentalFee } = await req.json();

    if (!bookingId || !customerId) {
      return NextResponse.json({ success: false, error: 'Missing bookingId or customerId' }, { status: 400 });
    }

    const res = await checkInBooking(bookingId, customerId, rentalFee);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
