
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateRentalFee } from '@/lib/pricing';

// Initialize Supabase Client with Service Role Key for Admin actions (skipping RLS if needed, or just standard client)
// For now, using standard env vars. If RLS blocks, we might need SERVICE_ROLE_KEY.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
    try {
        const { date } = await request.json();
        const targetDate = date ? new Date(date) : new Date();

        // 1. Define Start/End of the day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 2. Fetch "Unclosed" Bookings for this day
        // Status: CONFIRMED or CHECKED_IN
        // Filter: Overlap with today? Or just start_time in today?
        // Usually "Daily Log" implies bookings STARTING today.

        // Also need to check if they ALREADY have an invoice.
        // Supabase doesn't support sophisticated "loading" of filtering related tables easily in one go without join-filter.
        // We'll fetch bookings first, then filter out those with invoices.

        const { data: bookings, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                customers ( type ),
                courts ( * ),
                invoices ( id )
            `)
            // Start from beginning of the month
            .gte('start_time', new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).toISOString())
            .lte('start_time', endOfDay.toISOString())
            .in('status', ['CONFIRMED', 'CHECKED_IN']); // Only open bookings

        if (bookingError) throw bookingError;

        let generatedCount = 0;
        const errors = [];

        for (const booking of bookings) {
            // Skip if already has invoice
            if (booking.invoices && booking.invoices.length > 0) continue;

            // --- Calculate Total ---
            const startTime = new Date(booking.start_time);
            const scheduledEndTime = new Date(booking.end_time);
            // Assume "End of Day" means their booking time has passed. 
            // If the booking is in the future (e.g. running this at 10AM for a 8PM booking), we might want to skip?
            // "Close Day" usually implies end of day operation.

            // For auto-closing, we treat "Actual End Time" as "Scheduled End Time" if not checked out.
            // Or if they are CHECKED_IN, maybe we assume they played until now? 
            // Let's assume Actual = Scheduled for simplicity of "Auto-Close".
            const actualEndTime = scheduledEndTime;

            // 1. Rental Fee
            const pricingResult = calculateRentalFee(
                startTime,
                scheduledEndTime,
                booking.courts,
                booking.customers?.type || 'GUEST'
            );
            const rentalFee = pricingResult.rentalFee;

            // 2. Overtime (0 since we stick to schedule)
            const overtimeFee = 0;

            // 3. Products
            // We need to fetch items added to connection tables if any, but currently "pos" adds to state in checkout.
            // If they bought items mid-game, they should have been invoiced?
            // Current flow: CheckoutForm handles everything.
            // If we auto-close, we assume NO extra products were added pending payment.
            const productsFee = 0;

            // 4. Deposit
            const deposit = booking.deposit_amount || 0;

            const total = rentalFee + overtimeFee + productsFee - deposit;

            // --- Transaction: Tạo Invoice & Update Booking qua RPC ---
            const { data: rpcResult, error: rpcError } = await supabase.rpc('close_booking_and_invoice', {
                p_booking_id: booking.id,
                p_customer_id: booking.customer_id,
                p_total_amount: total,
                p_rental_fee: rentalFee,
                p_actual_end_time: actualEndTime.toISOString()
            });

            if (rpcError) {
                errors.push({ id: booking.id, error: rpcError.message });
            } else {
                const result = rpcResult as { success: boolean; error?: string };
                if (result && !result.success) {
                    errors.push({ id: booking.id, error: result.error || 'Lỗi không xác định từ Database' });
                } else {
                    generatedCount++;
                }
            }
        }

        return NextResponse.json({
            success: true,
            generated: generatedCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (err: unknown) {
        return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
