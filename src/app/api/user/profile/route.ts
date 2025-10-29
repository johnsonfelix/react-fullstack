// File: /app/api/user/profile/route.ts (or /pages/api/user/profile.ts if using pages)

import prisma from "@/app/prisma";
import { getServerSession } from "next-auth"; // if you're using next-auth
import { authOptions } from "@/lib/auth"; // your auth config

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    console.log('session.user3');
    console.log(session);
    

    const userId = session.user.userId; // assuming session.user.id exists
    const body = await req.json();

    // Create a new Supplier
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        city: body.city,
        state: body.state,
        zipcode: body.zipcode,
        status: "ACTIVE", // or whatever default status you want
        user: {
          connect: { id: userId }
        }
      } as any
    });

    // Update the User to link to the Supplier
    await prisma.user.update({
      where: { id: userId },
      data: {
        supplierId: supplier.id,
        profileCompleted: true
      }
    });

    return new Response(JSON.stringify({ supplier }), { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Something went wrong" }), { status: 500 });
  }
}
