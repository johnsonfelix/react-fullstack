
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    const email = 'johnsonfelix94@gmail.com';
    console.log(`Checking for user with email: ${email}`);

    const user = await prisma.user.findUnique({
        where: { email: email },
        include: { supplier: true }
    });

    if (user) {
        console.log('User found:', {
            id: user.id,
            email: user.email,
            username: user.username,
            type: user.type,
            supplierId: user.supplierId,
            password: user.password ? '(exists)' : '(missing)'
        });

        if (user.supplier) {
            console.log('Linked Supplier:', {
                id: user.supplier.id,
                companyName: user.supplier.companyName,
                status: user.supplier.status
            });
        } else {
            console.log('No linked supplier found for this user.');
        }

    } else {
        console.log('User NOT found.');
    }

    const supplier = await prisma.supplier.findUnique({
        where: { registrationEmail: email }
    });

    if (supplier) {
        console.log('Supplier found by registration email:', {
            id: supplier.id,
            companyName: supplier.companyName,
            status: supplier.status,
            registrationEmail: supplier.registrationEmail
        });
    } else {
        console.log('No supplier found with this registration email.');
    }

    await prisma.$disconnect();
}

checkUser().catch(e => {
    console.error(e);
    process.exit(1);
});
