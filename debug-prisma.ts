import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Connecting...');
    const id = 'cmja0f9m40000gag0qiqel0ho'; // ID from the logs
    try {
        await prisma.$executeRawUnsafe('DEALLOCATE ALL');
        const data = await prisma.procurementRequest.findUnique({
            where: { id },
            include: { items: true }
        });
        console.log('Success:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
