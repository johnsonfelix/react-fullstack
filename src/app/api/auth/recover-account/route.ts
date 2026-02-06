
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { hash, genSalt } from "bcrypt";
import crypto from "crypto";
import { sendAccountRecoveryEmail } from "@/lib/mail";

const prisma = new PrismaClient();

// Helper to generate a random password
const generatePassword = (length = 12) => {
    return crypto.randomBytes(length).toString("hex").slice(0, length);
};

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        // 1. Check if User exists
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            // Scenario A: User exists -> Send standard password reset (Mocking this for now as "Contact Admin" or just resetting if we had a token flow)
            // Since we don't have a full token-based reset flow yet, we'll generate a NEW temporary password for them to preserve the "Forgot Password" functionality requested.
            // ideally we sends a link, but to solve the "teamwokk" issue immediately, a temp password is effective.

            const tempPassword = generatePassword();
            const hashedPassword = await hash(tempPassword, 10);

            await prisma.user.update({
                where: { email },
                data: { password: hashedPassword },
            });

            await sendAccountRecoveryEmail(
                email,
                "Password Reset Request",
                `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Password Reset</h2>
          <p>You requested a password reset for your account.</p>
          <p><strong>Your new temporary password is:</strong> ${tempPassword}</p>
          <p>Please log in and change it immediately.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in">Login Here</a>
        </div>
        `,
                `Email: ${email}\nTemp Password: ${tempPassword}`
            );

            return NextResponse.json({ message: "Recovery email sent." });
        }

        // 2. Check if Supplier exists (but no User)
        const supplier = await prisma.supplier.findUnique({
            where: { registrationEmail: email },
        });

        if (supplier) {
            // Scenario B: Supplier exists but has no User account -> Create one
            const tempPassword = "Password@123";
            const hashedPassword = await hash(tempPassword, 10);

            // Generate unique username based on company name or email
            let username = supplier.companyName.replace(/\s+/g, '').toLowerCase() + crypto.randomInt(100, 999);

            // Ensure username uniqueness
            while (await prisma.user.findUnique({ where: { username } })) {
                username = supplier.companyName.replace(/\s+/g, '').toLowerCase() + crypto.randomInt(100, 999);
            }

            await prisma.user.create({
                data: {
                    email: supplier.registrationEmail,
                    username: username,
                    password: hashedPassword,
                    type: "SUPPLIER", // Assuming this enum/type exists
                    supplierId: supplier.id,
                    profileCompleted: true
                }
            });

            await sendAccountRecoveryEmail(
                email,
                "Your Supplier Account Credentials",
                `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Welcome to the Portal!</h2>
          <p>We found your supplier profile but noticed you didn't have a login account yet.</p>
          <p>We have created one for you:</p>
          <ul>
            <li><strong>Email:</strong> ${supplier.registrationEmail}</li>
            <li><strong>Password:</strong> ${tempPassword}</li>
          </ul>
          <p>Please log in to access your dashboard and RFPs.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/sign-in">Login Here</a>
        </div>
        `,
                `Email: ${supplier.registrationEmail}\nPassword: ${tempPassword}`
            );

            return NextResponse.json({ message: "Account created and credentials sent." });
        }

        // 3. Neither exists -> Do nothing (security best practice: don't reveal existence)
        // But returns success to UI
        return NextResponse.json({ message: "If an account exists, an email has been sent." });

    } catch (error) {
        console.error("Recovery error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
