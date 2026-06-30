import { NextRequest, NextResponse } from 'next/server';
import { addExpense } from '@/server/repositories/invoice-repo';

export async function POST(req: NextRequest) {
  try {
    const { title, type, amount, expenseDate, note, paymentMethod } = await req.json();

    if (!title || !type || !amount || !expenseDate || !paymentMethod) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    const res = await addExpense(title, type, amount, expenseDate, note, paymentMethod);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
