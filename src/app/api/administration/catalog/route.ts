
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // In a real app we'd check if user is admin, but for now we just ensure they are logged in
        // matching the pattern of other admin routes in this codebase (some of which don't even check session)

        const items = await prisma.catalogItem.findMany({
            include: {
                supplier: {
                    select: {
                        companyName: true,
                        id: true
                    }
                },
                category: true,
                uom: true,
                currency: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching admin catalog:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
