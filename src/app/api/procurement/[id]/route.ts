import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
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


export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log("Fetching ProcurementRequest with ID:", id);

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
      include: {
        suppliers:true,
        scopeOfWork: {
          include: {
            questions: {
  include: {
    subQuestions: true, // ✅ only if subQuestions is a relation
  },
},
          },
        },
      },
    });

    // update this code after linking SupplierListSection, appendix, evaluation criteia

    // const procurement = await prisma.procurementRequest.findUnique({
    //   where: { id },
    //   include: {
    //     suppliers: true,
    //     appendix: true,
    //     evaluationCriteria: true,
    //     scopeOfWork: {
    //       include: {
    //         questions: {
    //           include: {
    //             options: true,
    //             subQuestions: {
    //               include: {
    //                 options: true,
    //               },
    //             },
    //           },
    //         },
    //       },
    //     },
    //   },
    // });

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

