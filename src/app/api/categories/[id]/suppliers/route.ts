import { NextRequest } from "next/server";
import prisma from "@/app/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        group: {
          some: {
            id: params.id,
          },
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers for category:", error);
    return new Response(
      JSON.stringify({ message: "Failed to fetch suppliers" }),
      { status: 500 }
    );
  }
}
