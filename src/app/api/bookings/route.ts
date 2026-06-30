import { NextRequest, NextResponse } from 'next/server';
import { updateBookingTime, cancelBooking, createBooking } from '@/server/repositories/booking-repo';

export async function POST(req: NextRequest) {
  try {
    const { courtId, customerId, startTime, endTime } = await req.json();

    if (!courtId || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const res = await createBooking(courtId, customerId || null, startTime, endTime);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { bookingId, startTime, endTime, status } = await req.json();

    if (!bookingId) {
      return NextResponse.json({ success: false, error: 'Missing bookingId' }, { status: 400 });
    }

    if (status === 'CANCELLED') {
      const res = await cancelBooking(bookingId);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    if (startTime && endTime) {
      const res = await updateBookingTime(bookingId, startTime, endTime);
      if (!res.success) {
        return NextResponse.json({ success: false, error: res.error }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid action params' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
