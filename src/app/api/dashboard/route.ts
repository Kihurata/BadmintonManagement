import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/server/repositories/dashboard-repo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const selectedDate = dateParam ? new Date(dateParam) : new Date();

    const data = await getDashboardData(selectedDate);

    return NextResponse.json(
      {
        success: true,
        ...data
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0'
        }
      }
    );
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
