import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

// DELETE: Delete a procurement request by ID
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1); // Extract [id] from /api/procurement/[id]

    console.log("Attempting to delete ProcurementRequest with ID:", id);

    const existing = await prisma.procurementRequest.findUnique({
      where: { id },
    });
    console.log("Existing ProcurementRequest:", existing);

    if (!existing) {
      console.log("ProcurementRequest not found.");
      return NextResponse.json(
        { error: "ProcurementRequest not found" },
        { status: 404 }
      );
    }

    await prisma.procurementRequest.delete({
      where: { id },
    });
    console.log("ProcurementRequest deleted successfully.");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting procurement request:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", detail: JSON.stringify(error) },
      { status: 500 }
    );
  }
}

// GET: Fetch a procurement request by ID with nested relations
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathnameParts = url.pathname.split("/");
    const id = pathnameParts.at(-1); // Extract [id] from /api/procurement/[id]

    console.log("Fetching ProcurementRequest with ID:", id);

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        suppliers: true,
        scopeOfWork: {
          include: {
            questions: {
              include: {
                subQuestions: true, // or include: { options: true, subQuestions: { include: { options: true } } } if needed
              },
            },
          },
        },
        // You can re-enable below when linked:
        // appendix: true,
        // evaluationCriteria: true,
      },
    });

    if (!procurement) {
      console.log("ProcurementRequest not found.");
      return NextResponse.json(
        { error: "ProcurementRequest not found" },
        { status: 404 }
      );
    }

    console.log("ProcurementRequest fetched successfully.");
    return NextResponse.json(procurement, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching procurement request:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error", detail: JSON.stringify(error) },
      { status: 500 }
    );
  }
}
