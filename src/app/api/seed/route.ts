import { NextResponse } from "next/server";
import prisma from "@/app/prisma";
import { hash } from 'bcrypt';

export async function GET() {
    try {
        const results: Record<string, string> = {};

        // Seed Currencies
        const currencyCount = await prisma.currency.count();
        if (currencyCount === 0) {
            await prisma.currency.createMany({
                data: [
                    { name: "USD" }, { name: "EUR" }, { name: "GBP" }, { name: "AED" }, { name: "SAR" }
                ]
            });
            results["currencies"] = "Seeded";
        }

        // Seed Categories
        const catCount = await prisma.productCategory.count();
        if (catCount === 0) {
            await prisma.productCategory.createMany({
                data: [
                    { name: "IT Hardware" }, { name: "Professional Services" }, { name: "Marketing" }, { name: "Facilities" }, { name: "Logistics" }
                ]
            });
            results["categories"] = "Seeded";
        }

        // Seed Service Types
        const svcCount = await prisma.serviceType.count();
        if (svcCount === 0) {
            await prisma.serviceType.createMany({
                data: [{ name: "Consulting" }, { name: "Maintenance" }, { name: "Installation" }]
            });
            results["serviceTypes"] = "Seeded";
        }

        // Seed Users (Basic)
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            await prisma.user.create({
                data: {
                    username: "admin_user",
                    password: "hashed_password_placeholder",
                    email: "admin@example.com",
                    type: "ADMIN"
                }
            });
            results["users"] = "Seeded one admin";
        }

        // Create Test User
        const existingUser = await prisma.user.findUnique({ where: { email: 'doe@gmail.com' } });
        if (!existingUser) {
            const hashedPassword = await hash('123123123', 10); // Hash the password
            await prisma.user.create({
                data: {
                    username: "john_doe",
                    password: hashedPassword,
                    email: "doe@gmail.com",
                    type: "USER"
                }
            });
            results["testUser"] = "Seeded test user 'john_doe'";
        }

        return NextResponse.json({ message: "Seeding complete", changes: results });
    } catch (error: any) {
        console.error("Seeding error:", error);
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
