
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixUserRole() {
    const email = 'johnsonfelix94@gmail.com';
    console.log(`Fixing role for: ${email}`);

    try {
        const supplier = await prisma.supplier.findUnique({
            where: { registrationEmail: email }
        });

        if (!supplier) {
            console.error("Supplier record not found for this email!");
            return;
        }

        console.log(`Found supplier: ${supplier.companyName} (${supplier.id})`);

        const user = await prisma.user.update({
            where: { email: email },
            data: {
                type: 'supplier',
                supplierId: supplier.id
            }
        });

        console.log('User updated successfully:', {
            id: user.id,
            email: user.email,
            type: user.type,
            supplierId: user.supplierId
        });

    } catch (error) {
        console.error("Error updating user:", error);
    } finally {
        await prisma.$disconnect();
    }
}

fixUserRole().catch(e => {
    console.error(e);
    process.exit(1);
});
