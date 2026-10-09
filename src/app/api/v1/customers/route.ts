import { NextResponse } from 'next/server';
import { getCustomers } from '@/server/repositories/product-repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json(
      { success: true, data: customers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
