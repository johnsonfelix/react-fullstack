import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/prisma';
import { hash } from 'bcrypt';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      firstName,
      lastName,
      email,
      state,
      city,
      zipcode,
      status = 'pending', // default status if not provided
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if a user already exists with this email
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create the supplier
    const newSupplier = await prisma.supplier.create({
      data: {
        name,
        firstName,
        lastName,
        state,
        city,
        zipcode,
        status,
      },
    });

    const hashedPassword = await hash('123123132', 10); 

    // Create the user linked to the supplier
    const newUser = await prisma.user.create({
      data: {
        email,
        username: email,
        password: hashedPassword, // Set default or temporary password
        type: 'supplier',
        profileCompleted: false,
        supplier: {
          connect: { id: newSupplier.id },
        },
      },
    });

    return NextResponse.json(
      { message: 'Supplier and user created successfully', supplier: newSupplier, user: newUser },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in /api/suppliers/manual-create:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
