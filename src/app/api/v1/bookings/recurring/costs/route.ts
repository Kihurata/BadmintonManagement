import { NextRequest, NextResponse } from 'next/server';
import { verifyUserRole } from '@/lib/api-auth';
import { calculateRecurringRuleCost, calculateMultipleRecurringRulesCosts } from '@/server/repositories/booking-repo';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyUserRole(['OWNER', 'MANAGER', 'STAFF']);
    if (!auth.success || !auth.tenantId) {
      return auth.errorResponse || NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const ruleIdsParam = searchParams.get('ruleIds');
    const ruleId = searchParams.get('ruleId');

    if (ruleIdsParam) {
      const ids = ruleIdsParam.split(',').filter(Boolean);
      const uuidSchema = z.string().uuid();
      const invalid = ids.some(id => !uuidSchema.safeParse(id).success);
      if (invalid || ids.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: 'BAD_REQUEST', message: 'Invalid ruleIds parameter.' } },
          { status: 400 }
        );
      }
      const summaries = await calculateMultipleRecurringRulesCosts(ids);
      return NextResponse.json({
        success: true,
        data: summaries,
      });
    }

    if (!ruleId || !z.string().uuid().safeParse(ruleId).success) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: 'Missing or invalid ruleId or ruleIds.' } },
        { status: 400 }
      );
    }

    const costSummary = await calculateRecurringRuleCost(ruleId);
    if (!costSummary) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recurring rule not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: costSummary,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: (error as Error).message } },
      { status: 500 }
    );
  }
}
