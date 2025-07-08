import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const newProcurement = await prisma.procurementRequest.create({
      data: {
        title: data.title,
        description: data.description,
        requestType: data.requestType,
        category: data.category,
        address: data.address,
        status: data.status || "draft",
        additionalFields: data.additionalFields || {},
        aiQuestions: data.aiQuestions || null,
      },
    });

    return NextResponse.json(newProcurement, { status: 201 });
  } catch (error) {
    console.error("Error creating procurement request:", error);
    return NextResponse.json(
      { error: "Failed to create procurement request" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();

    if (!data.id) {
      return NextResponse.json({ error: "Missing procurement request ID" }, { status: 400 });
    }

    const updatedProcurement = await prisma.procurementRequest.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        requestType: data.requestType,
        category: data.category,
        address: data.address,
        status: data.status || "draft",
        additionalFields: data.additionalFields || {},
        // aiQuestions: data.aiQuestions || null,
      },
    });

    return NextResponse.json(updatedProcurement, { status: 200 });
  } catch (error) {
    console.error("Error updating procurement request:", error);
    return NextResponse.json(
      { error: "Failed to update procurement request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing ID parameter" }, { status: 400 });
    }

    const procurement = await prisma.procurementRequest.findUnique({
      where: { id },
    });

    if (!procurement) {
      return NextResponse.json({ error: "Procurement request not found" }, { status: 404 });
    }

    return NextResponse.json(procurement, { status: 200 });
  } catch (error) {
    console.error("Error fetching procurement request:", error);
    return NextResponse.json(
      { error: "Failed to fetch procurement request" },
      { status: 500 }
    );
  }
}
