import { NextRequest } from "next/server";
import prisma from "@/app/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const categories = await prisma.productCategory.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive", // case-insensitive
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return Response.json(categories);
  } catch (error) {
    console.error("Error searching categories:", error);
    return new Response(
      JSON.stringify({ message: "Failed to search categories" }),
      { status: 500 }
    );
  }
}
