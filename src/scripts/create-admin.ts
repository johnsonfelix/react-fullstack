
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@inventory.com';
    const password = 'adminPassword123!';
    const username = 'admin';

    const hashedPassword = await hash(password, 10);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        console.log(`Creating user with email: ${email}`);
        const user = await prisma.user.create({
            data: {
                email,
                username,
                password: hashedPassword,
                type: 'ADMIN', // Using ADMIN as seen in seed/route.ts
                profileCompleted: true,
            },
        });
        console.log(`Created admin user: ${user.email} with ID: ${user.id}`);
    } else {
        console.log(`User ${email} already exists.`);
        // Update password to ensure we know it
        await prisma.user.update({
            where: { email },
            data: {
                password: hashedPassword,
                type: 'ADMIN' // Ensure type is ADMIN
            }
        });
        console.log(`Updated password and role for ${email}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
