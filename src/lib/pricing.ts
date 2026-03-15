
import { isBefore, isAfter, differenceInMinutes } from 'date-fns';
import { Court } from '@/types';

export interface PricingResult {
    rentalFee: number;
    morningHours: number;
    eveningHours: number;
    morningRate: number;
    eveningRate: number;
}

export function calculateRentalFee(
    startTime: Date,
    endTime: Date,
    court: Court | Partial<Court>,
    customerType: 'LOYAL' | 'GUEST' = 'GUEST'
): PricingResult {
    const EVENING_START_HOUR = 18; // 6 PM
    const VN_TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

    // Shift to VN epoch to safely calculate boundaries regardless of server timezone (Vercel uses UTC)
    const startMs = startTime.getTime();
    const vnStartMs = startMs + VN_TZ_OFFSET_MS;

    // Floor to get 00:00:00 VN time
    const startOfDayVnMs = vnStartMs - (vnStartMs % (24 * 60 * 60 * 1000));

    // Add 18 hours to get the pivot point in VN time, then shift back to real UTC epoch
    const eveningPivotVnMs = startOfDayVnMs + (EVENING_START_HOUR * 60 * 60 * 1000);
    const eveningPivotMs = eveningPivotVnMs - VN_TZ_OFFSET_MS;

    const eveningPivot = new Date(eveningPivotMs);

    let morningMins = 0;
    let eveningMins = 0;

    // Check interval overlap
    // Case 1: End Time is before Pivot -> All Morning
    if (isBefore(endTime, eveningPivot) || endTime.getTime() === eveningPivot.getTime()) {
        morningMins = differenceInMinutes(endTime, startTime);
    }
    // Case 2: Start Time is after Pivot -> All Evening
    else if (isAfter(startTime, eveningPivot) || startTime.getTime() === eveningPivot.getTime()) {
        eveningMins = differenceInMinutes(endTime, startTime);
    }
    // Case 3: Split
    else {
        morningMins = differenceInMinutes(eveningPivot, startTime);
        eveningMins = differenceInMinutes(endTime, eveningPivot);
    }

    // Default to 0 if negative (shouldn't happen with valid bookings)
    morningMins = Math.max(0, morningMins);
    eveningMins = Math.max(0, eveningMins);

    const morningHours = morningMins / 60;
    const eveningHours = eveningMins / 60;

    // Get Rates
    const morningRate = customerType === 'LOYAL'
        ? (court.morning_price_loyal ?? 50000)
        : (court.morning_price_guest ?? 60000);

    const eveningRate = customerType === 'LOYAL'
        ? (court.evening_price_loyal ?? 70000)
        : (court.evening_price_guest ?? 80000);

    const rentalFee = (morningHours * morningRate) + (eveningHours * eveningRate);

    return {
        rentalFee,
        morningHours,
        eveningHours,
        morningRate,
        eveningRate
    };
}
