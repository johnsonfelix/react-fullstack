
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { email: 'doe@gmail.com' },
    });

    if (user) {
        console.log(`User found: ${user.username} (${user.email})`);
        console.log(`Password hash len: ${user.password?.length}`);
    } else {
        console.log('User NOT found');
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
