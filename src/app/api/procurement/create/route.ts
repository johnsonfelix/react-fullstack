import { NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate minimum required fields
    if (!body.requestType || !body.category || !body.address) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const procurement = await prisma.procurementRequest.create({
      data: {
        title:
          body.title ||
          body.description?.slice(0, 50) ||
          "Untitled Procurement",
        description: body.description || "",
        requestType: body.requestType,
        category: body.category,
        address: body.address,
        status: body.status || "draft",
        additionalFields: {
          ...(body.additionalFields || {}),
          bidOpenDate: body.bidOpenDate,
          bidCloseDate: body.bidCloseDate,
          clarificationDate: body.clarificationDate
        },
        attachments: body.attachments ? body.attachments : undefined,
        aiQuestions: body.aiQuestions ? body.aiQuestions : undefined, // ✅ NEW: Save AI questions JSON if provided

        scopeOfWork: body.scopeOfWork
          ? {
            create: body.scopeOfWork.map((sow: any) => ({
              title: sow.title,
              description: sow.description,
              userInstruction: sow.userInstruction || null,
            })),
          }
          : undefined,

        items: body.items
          ? {
            create: body.items.map((item: any) => ({
              title: item.title,
              quantity: parseInt(item.quantity, 10),
              price: item.price ? parseInt(item.price, 10) : undefined,
              manufacturerPartNo: item.manufacturerPartNumber,
              uom: item.uom
            })),
          }
          : undefined,
      },
      include: {
        scopeOfWork: true,
        items: true,
      },
    });

    return NextResponse.json(procurement);
  } catch (err: any) {
    console.error("Error creating procurement request:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
