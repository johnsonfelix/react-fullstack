
const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcrypt');
const prisma = new PrismaClient();

async function resetPassword() {
    const email = 'johnsonfelix94@gmail.com';
    const newPassword = 'Password@123';

    console.log(`Resetting password for: ${email}`);

    try {
        const hashedPassword = await hash(newPassword, 10);

        // Check if user exists first
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            console.log("User not found in User table.");
            // Check if supplier exists to potentially create the user
            const supplier = await prisma.supplier.findUnique({ where: { registrationEmail: email } });
            if (supplier) {
                console.log("Supplier found. Creating User record...");
                await prisma.user.create({
                    data: {
                        email: email,
                        username: email, // Default username to email
                        password: hashedPassword,
                        type: "supplier",
                        profileCompleted: true,
                        supplierId: supplier.id
                    }
                });
                console.log("User created and linked to supplier.");
            } else {
                console.log("No supplier record found either.");
            }
        } else {
            // Update existing user
            await prisma.user.update({
                where: { email: email },
                data: { password: hashedPassword }
            });
            console.log(`Password updated successfully for user ID: ${user.id}`);
        }

    } catch (error) {
        console.error("Error resetting password:", error);
    } finally {
        await prisma.$disconnect();
    }
}

resetPassword().catch(e => {
    console.error(e);
    process.exit(1);
});
