// app/api/admin/workflow/award/route.ts
import { NextResponse } from 'next/server';
import prisma from "@/app/prisma";

export const dynamic = 'force-dynamic';
const WORKFLOW_NAME = 'default_award_workflow';

function safeParseConfig(raw: unknown): { rules: any[]; notificationMapping: Record<string, any> } {
  // raw may be: undefined | null | object | string (JSON)
  let cfg: any = {};
  try {
    if (raw == null) {
      cfg = {};
    } else if (typeof raw === 'string') {
      // if stored as stringified JSON
      cfg = JSON.parse(raw);
    } else if (typeof raw === 'object') {
      // already an object (could still be a JsonValue union)
      cfg = raw;
    } else {
      cfg = {};
    }
  } catch (err) {
    console.warn('Failed to parse award workflow config JSON, falling back to empty config', err);
    cfg = {};
  }

  const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
  const notificationMapping = cfg.notificationMapping && typeof cfg.notificationMapping === 'object' ? cfg.notificationMapping : {};

  return { rules, notificationMapping };
}

export async function GET() {
  try {
    return NextResponse.json({});
    // const wf = await prisma.awardWorkflow.findUnique({ where: { name: WORKFLOW_NAME } });

    // if (!wf) {
    //   return NextResponse.json(
    //     {
    //       data: {
    //         rules: [{ id: 'value_threshold', type: 'value_threshold', value: 50000, description: 'Awards > 50k require approval' }],
    //         notificationMapping: {},
    //       },
    //     },
    //     { status: 200 }
    //   );
    // }

    // const { rules, notificationMapping } = safeParseConfig(wf.config);

    // return NextResponse.json({ data: { rules, notificationMapping } }, { status: 200 });
  } catch (err) {
    console.error('GET /admin/workflow/award error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) ?? {};
    // normalize inputs
    const incomingRules = Array.isArray(body.rules) ? body.rules : [];
    const incomingNotificationMapping = body.notificationMapping && typeof body.notificationMapping === 'object' ? body.notificationMapping : {};

    const config = { ...body.config, rules: incomingRules, notificationMapping: incomingNotificationMapping };

    // const upsert = await prisma.awardWorkflow.upsert({
    //   where: { name: WORKFLOW_NAME },
    //   create: { name: WORKFLOW_NAME, description: 'Award workflow config', config, createdBy: 'system' },
    //   update: { config },
    // });

    return NextResponse.json({});
  } catch (err) {
    console.error('POST /admin/workflow/award error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
