
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const smeCount = await prisma.supplier.count({
            where: { supplierType: 'SME' }
        });

        console.log(`Found ${smeCount} SME suppliers.`);

        if (smeCount === 0) {
            console.log('No SME suppliers found. Updating a random supplier to be SME...');
            const firstSupplier = await prisma.supplier.findFirst();
            if (firstSupplier) {
                await prisma.supplier.update({
                    where: { id: firstSupplier.id },
                    data: { supplierType: 'SME' }
                });
                console.log(`Updated supplier ${firstSupplier.companyName} (${firstSupplier.id}) to SME.`);
            } else {
                console.log('No suppliers found in database to update.');
            }
        } else {
            const smeSupplier = await prisma.supplier.findFirst({
                where: { supplierType: 'SME' }
            });
            console.log(`Example SME Supplier: ${smeSupplier.companyName}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
