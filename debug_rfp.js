
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const rfpId = 'cml7mj1pf0006gaqkfulg088x';
    console.log(`Checking RFP: ${rfpId}`);

    const rfp = await prisma.procurementRequest.findUnique({
        where: { id: rfpId },
        select: { id: true, title: true, deliverables: true, scopeOfWork: true }
    });

    if (!rfp) {
        console.log("RFP not found");
    } else {
        console.log("RFP Found:", rfp.title);
        console.log("Deliverables (JSON):", JSON.stringify(rfp.deliverables, null, 2));
        console.log("ScopeOfWork (Rel):", JSON.stringify(rfp.scopeOfWork, null, 2));
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
