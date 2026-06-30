import { NextResponse } from 'next/server';
import { getCustomers } from '@/server/repositories/product-repo';

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
