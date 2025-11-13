import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

// Prisma works best on the Node.js runtime (not edge)
export const runtime = "nodejs";

/**
 * GET /api/administration/questionnaire-categories/[categoryId]
 * Returns a single QuestionnaireCategory by id.
 *
 * Response shape (normalized to what your frontend expects):
 * { id: string, name: string, order: number }
 */
export async function GET(request, { params }) {
  // take categoryId from params (no TS typing on signature to avoid ParamCheck mismatch)
  const rawParam = params?.categoryId;
  if (!rawParam) {
    return NextResponse.json({ error: "Missing categoryId" }, { status: 400 });
  }

  // normalize: if Next gave an array (catch-all) join, then take last segment after any slashes
  const rawIdStr = Array.isArray(rawParam) ? rawParam.join("/") : String(rawParam);
  const idSegment = rawIdStr.split("/").pop() || rawIdStr;
  const id = decodeURIComponent(idSegment);

  try {
    const category = await prisma.questionnaireCategory.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        order: true,
      },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json(
      { id: category.id, name: category.name, order: category.order },
      { status: 200 }
    );
  } catch (err) {
    console.error("GET /questionnaire-categories/[categoryId] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
