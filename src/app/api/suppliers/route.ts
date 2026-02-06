import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { hash } from "bcrypt";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            name,
            username,
            password,
            email,
            state,
            city,
            zipcode,
            status
        } = body;

        // 1. Basic Validation
        if (!name || !username || !password || !email) {
            return NextResponse.json(
                { message: "Missing required fields: name, username, password, email" },
                { status: 400 }
            );
        }

        // 2. Check if User/Supplier already exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email or username already exists" },
                { status: 409 }
            );
        }

        const existingSupplier = await prisma.supplier.findUnique({
            where: { registrationEmail: email },
        });

        if (existingSupplier) {
            return NextResponse.json(
                { message: "Supplier with this email already exists" },
                { status: 409 }
            );
        }

        // 3. Create Supplier, Address (optional), and User in a transaction
        const hashedPassword = await hash(password, 10);

        const result = await prisma.$transaction(async (tx) => {
            // A. Create Supplier
            // We fill in required fields with defaults if not provided in the simplified form
            const newSupplier = await tx.supplier.create({
                data: {
                    companyName: name,
                    registrationEmail: email,
                    status: status || "pending",
                    // Required fields in schema but not in simple create form:
                    organizationType: "Corporation", // Default
                    supplierType: "Goods",           // Default
                    country: "Unknown",              // Default or derived
                },
            });

            // B. Create Address (if state/city/zip provided)
            if (state || city || zipcode) {
                await tx.address.create({
                    data: {
                        supplierId: newSupplier.id,
                        type: "Billing",       // Default for primary address
                        line1: "Not Specified", // Required field
                        city: city || "Unknown",
                        state: state || "Unknown",
                        postalCode: zipcode || "00000",
                        country: "Unknown",
                    },
                });
            }

            // C. Create User linked to Supplier
            const newUser = await tx.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    type: "SUPPLIER",
                    supplierId: newSupplier.id,
                },
            });

            return { supplier: newSupplier, user: newUser };
        });

        return NextResponse.json(
            { message: "Supplier created successfully", data: result },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("Error creating supplier:", error);
        return NextResponse.json(
            { message: "Internal Server Error", error: error.message },
            { status: 500 }
        );
    }
}
