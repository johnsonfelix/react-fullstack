
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'doe@gmail.com';
    const password = '123123123';
    const hashedPassword = await hash(password, 10);

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (!existingUser) {
        const user = await prisma.user.create({
            data: {
                email,
                username: 'doe',
                password: hashedPassword,
                type: 'admin',
                profileCompleted: true,
            },
        });
        console.log(`Created user: ${user.email}`);
    } else {
        console.log(`User ${email} already exists.`);
        // Update password just in case it was wrong
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        console.log(`Updated password for ${email}`);
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
