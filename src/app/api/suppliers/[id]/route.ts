import { NextResponse } from "next/server";
import prisma from "@/app/prisma"; // adjust as needed

interface Params {
  params: { id: string };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;

  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return NextResponse.json({ error: 'Failed to fetch supplier' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const supplierId = params.id;

  try {
    // 1. Delete the associated user (must come first due to FK constraint)
    await prisma.user.deleteMany({
      where: { supplierId },
    });

    // 2. Delete the supplier
    await prisma.supplier.delete({
      where: { id: supplierId },
    });

    return NextResponse.json({ message: "Supplier and User deleted successfully" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
  }
}

export default async function handler(req: any, res:any) {
  const { id } = req.query;
  if (req.method === "POST") {
    const { categoryId } = req.body;
    try {
      await prisma.supplier.update({
        where: { id: id as string },
        data: {
          group: {
            connect: { id: categoryId },
          },
        },
      });
      res.status(200).json({ message: "Category added to supplier" });
    } catch (error) {
      res.status(500).json({ error: "Failed to add category" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
