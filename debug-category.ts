import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const id = 'cmja0f9m40000gag0qiqel0ho';
    try {
        const data = await prisma.procurementRequest.findUnique({
            where: { id },
            select: { id: true, category: true }
        });
        console.log('RFP Data:', JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
