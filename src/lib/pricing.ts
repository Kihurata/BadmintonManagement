
import { set, isBefore, isAfter, differenceInMinutes } from 'date-fns';
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

    // Define pivot time (17:00 on the same day as startTime)
    // NOTE: Assumes booking within a single day for now.
    const eveningPivot = set(startTime, { hours: EVENING_START_HOUR, minutes: 0, seconds: 0, milliseconds: 0 });

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
