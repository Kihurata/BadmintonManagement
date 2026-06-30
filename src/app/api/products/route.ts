import { NextResponse } from 'next/server';
import { getAvailableProducts } from '@/server/repositories/product-repo';

export async function GET() {
  try {
    const products = await getAvailableProducts();
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
