// app/api/awards/initiate/route.ts
import { NextResponse } from 'next/server';
import prisma from "@/app/prisma";

export const dynamic = 'force-dynamic';
const WORKFLOW_NAME = 'default_award_workflow';

type Payload = {
  brfqId: string;
  supplierIds: string[];
  justification?: string;
  estimatedValue?: number;
  splitAward?: boolean;
  winners?: { supplierId: string; amount?: number }[];
};

// safe parser + evaluator (drop into app/api/awards/initiate/route.ts)
function safeParseConfig(raw: unknown): { rules: any[]; notificationMapping: Record<string, any> } {
  let cfg: any = {};
  try {
    if (raw == null) cfg = {};
    else if (typeof raw === 'string') cfg = JSON.parse(raw);
    else if (typeof raw === 'object') cfg = raw;
    else cfg = {};
  } catch (e) {
    console.warn("Failed to parse AwardWorkflow.config", e);
    cfg = {};
  }

  const rules = Array.isArray(cfg?.rules) ? cfg.rules : [];
  const notificationMapping = cfg?.notificationMapping && typeof cfg.notificationMapping === 'object' ? cfg.notificationMapping : {};
  return { rules, notificationMapping };
}

/**
 * Evaluate rules safely.
 * - `rules` can be anything (unknown / JsonValue) so we cast per-item to `any`
 * - We avoid accessing properties directly on a potentially-`never` typed value
 */
function evaluateRules(rulesRaw: unknown, payload: Payload, brfqData: any | null) {
  const messages: string[] = [];
  const rules: any[] = Array.isArray(rulesRaw) ? rulesRaw : [];

  const estValue = Number(payload.estimatedValue || 0);
  const isSplit = Boolean(payload.splitAward);

  for (const rawRule of rules) {
    // treat each rule as any to avoid TS narrowing issues
    const r: any = rawRule ?? {};
    const type = typeof r.type === 'string' ? r.type : String(r.type ?? '');
    // value threshold
    if (type === 'value_threshold') {
      const threshold = Number(r.value || 0);
      if (estValue > threshold) {
        messages.push(`Estimated award value ${estValue} exceeds threshold ${threshold}.`);
      }
    }

    // category threshold (ensure categories is an array)
    if (type === 'category_threshold') {
      const categories = Array.isArray(r.categories) ? r.categories : (typeof r.categories === 'string' ? r.categories.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      const brfqCategories: string[] = Array.isArray(brfqData?.customerCategory) ? brfqData.customerCategory : Array.isArray(brfqData?.categoryIds) ? brfqData.categoryIds : [];
      if (categories.length > 0 && brfqCategories.some((c: string) => categories.includes(c))) {
        const threshold = Number(r.value || 0);
        if (estValue > threshold) {
          messages.push(`Category-specific threshold exceeded for categories: ${categories.join(', ')}.`);
        }
      }
    }

    // require higher approval on split
    if (type === 'require_higher_approval_on_split' && isSplit) {
      messages.push(`Split award to ${payload.supplierIds.length} suppliers requires higher-level approval.`);
    }
  }

  return messages;
}



// ----------------------------
// POST: INITIATE AWARD
// ----------------------------
export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Payload;

    if (!payload?.brfqId || !Array.isArray(payload.supplierIds) || payload.supplierIds.length === 0) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    // Get workflow config
    // const wf = await prisma.awardWorkflow.findUnique({
    //   where: { name: WORKFLOW_NAME }
    // });

    // const { rules } = safeParseConfig(wf?.config);
    const rules: any[] = [];

    // Get BRFQ
    const brfq = await prisma.bRFQ.findUnique({
      where: { id: payload.brfqId }
    });

    const triggered = evaluateRules(rules, payload, brfq);
    const now = new Date();

    // Create Award record
    const award = await prisma.award.create({
      data: {
        rfqId: payload.brfqId,
        supplierId: payload.supplierIds[0] || "unknown", // Schema requires a single supplierId
        comments: payload.justification || "",
        // justification: payload.justification,
        // estimatedValue: payload.estimatedValue,
        // splitAward: Boolean(payload.splitAward),
        // createdBy: "system",
        // createdAt: now,
        // status: triggered.length === 0 ? "approved" : "pending",
        // approvedAt: triggered.length === 0 ? now : null,
        // approvedBy: triggered.length === 0 ? "system" : null
      }
    });

    // Save winners (optional)
    // if (Array.isArray(payload.winners)) {
    //   await Promise.all(
    //     payload.winners.map((w) =>
    //       prisma.awardWinner.create({
    //         data: {
    //           awardId: award.id,
    //           supplierId: w.supplierId,
    //           amount: w.amount ?? null
    //         }
    //       })
    //     )
    //   );
    // }

    // If RULES TRIGGERED → approval required
    // if (triggered.length > 0) {
    //   await prisma.awardApprovalHistory.create({
    //     data: {
    //       awardId: award.id,
    //       action: "requested",
    //       byUser: payload.justification ?? "system",
    //       note: JSON.stringify({ triggered })
    //     }
    //   });

    //   return NextResponse.json(
    //     {
    //       approved: false,
    //       message: "Approval workflow started.",
    //       warnings: triggered,
    //       awardId: award.id
    //     },
    //     { status: 200 }
    //   );
    // }

    // AUTO APPROVED
    await prisma.bRFQ.update({
      where: { id: payload.brfqId },
      data: {
        status: "awarded",
        approvalStatus: "approved",
        approvedAt: now,
        approvedBy: "system"
      }
    });

    // await prisma.awardApprovalHistory.create({
    //   data: {
    //     awardId: award.id,
    //     action: "approved",
    //     byUser: "system",
    //     note: JSON.stringify({ auto: true })
    //   }
    // });

    return NextResponse.json(
      { approved: true, message: "Award auto-approved", awardId: award.id },
      { status: 200 }
    );
  } catch (err) {
    console.error("POST /api/awards/initiate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
