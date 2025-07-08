import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

// GET: Fetch all ProcurementRequests
export async function GET() {
  try {
    const rfps = await prisma.procurementRequest.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        requestType: true,
        category: true,
        additionalFields:true,
        address: true,
        createdAt: true,
        updatedAt: true,
        suppliers:true
        // Include these if you want to display them in detail pages
        // scopeOfWork: true,
        // items: true,
      },
    });

    return NextResponse.json(rfps);
  } catch (error: any) {
    console.error("Error fetching procurement requests:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
