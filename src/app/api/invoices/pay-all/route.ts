import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revalidateTag } from 'next/cache';

export async function POST(request: Request) {
    try {
        const supabase = createClient();
        const { customer_id, payment_method } = await request.json();

        let query = supabase
            .from('invoices')
            .select('id, total_amount, paid_amount, tenant_id')
            .or('status.eq.UNPAID,status.eq.PARTIALLY_PAID,is_paid.eq.false');

        if (customer_id === null || customer_id === 'guest') {
            query = query.is('customer_id', null);
        } else {
            query = query.eq('customer_id', customer_id);
        }

        const { data: unpaidInvoices, error: fetchError } = await query;
        if (fetchError) {
            throw fetchError;
        }

        if (unpaidInvoices && unpaidInvoices.length > 0) {
            const txRecords = unpaidInvoices.map(inv => {
                const remaining = inv.total_amount - (inv.paid_amount || 0);
                return {
                    tenant_id: inv.tenant_id,
                    type: 'INCOME',
                    category: 'INVOICE_PAYMENT',
                    amount: remaining > 0 ? remaining : inv.total_amount,
                    payment_method: payment_method || 'CASH',
                    reference_type: 'INVOICE',
                    reference_id: inv.id,
                    description: 'Thanh toán gộp hóa đơn'
                };
            }).filter(r => r.amount > 0);

            if (txRecords.length > 0) {
                const { error: txError } = await supabase.from('transactions').insert(txRecords);
                if (txError) throw txError;
            }

            if (unpaidInvoices[0]?.tenant_id) {
                revalidateTag(`dashboard:${unpaidInvoices[0].tenant_id}`);
            }
            revalidateTag('dashboard:current-month');
        }

        return NextResponse.json({ success: true });

    } catch (err: unknown) {
        return NextResponse.json({ error: (err instanceof Error ? err.message : String(err)) }, { status: 500 });
    }
}
