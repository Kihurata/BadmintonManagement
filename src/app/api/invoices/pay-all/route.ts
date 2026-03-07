import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = createClient();


        const { customer_id, payment_method } = await request.json();

        let query = supabase
            .from('invoices')
            .update({ is_paid: true, payment_method: payment_method || 'CASH' })
            .eq('is_paid', false);

        if (customer_id === null || customer_id === 'guest') {
            query = query.is('customer_id', null);
        } else {
            query = query.eq('customer_id', customer_id);
        }

        const { error } = await query;

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
