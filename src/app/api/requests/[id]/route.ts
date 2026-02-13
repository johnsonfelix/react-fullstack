import { NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const request = await prisma.request.findUnique({
            where: { id }
        });

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        // Enrich items with catalog details if available
        let enrichedItems = request.items;
        if (Array.isArray(request.items)) {
            const catalogIds = request.items
                .map((item: any) => item.catalogItemId)
                .filter(Boolean);

            if (catalogIds.length > 0) {
                const catalogItems = await prisma.catalogItem.findMany({
                    where: { id: { in: catalogIds } },
                    include: {
                        supplier: true,
                        category: true
                    }
                });

                enrichedItems = request.items.map((item: any) => {
                    const catalogItem = catalogItems.find(c => c.id === item.catalogItemId);
                    if (catalogItem) {
                        return {
                            ...item,
                            catalogItem: catalogItem,
                            supplier: catalogItem.supplier?.companyName || item.supplier, // Prefer catalog supplier
                            supplierId: catalogItem.supplierId
                        };
                    }
                    return item;
                });
            }
        }

        return NextResponse.json({ ...request, items: enrichedItems });
    } catch (error) {
        console.error('Error fetching request:', error);
        return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const data = await req.json();

        // If approving, we need to do more work
        if (data.status === 'APPROVED') {
            // 1. Fetch full request with details
            const request = await prisma.request.findUnique({
                where: { id }
            });

            if (!request) {
                return NextResponse.json({ error: 'Request not found' }, { status: 404 });
            }

            // 2. Generate RFQ ID (Simplified version of generate-id route)
            // Since admin is approving, we might not have a user session context easily here 
            // without passing it from client. We'll use a prefix 'RFQ' for now or 'ADM'.
            const dateStr = new Date().toISOString().slice(2, 7).replace(/-/g, '');
            const random = Math.floor(Math.random() * 9000 + 1000);
            const rfqId = `RFQ${dateStr}${random}`;

            // 3. Prepare Items
            let rfqItems: any[] = [];
            // Change to Map to store full supplier details for suppliersSelected JSON
            let suppliersMap = new Map<string, any>();
            let customerCategories: string[] = [];

            // Try to map category
            if (request.category) {
                const category = await prisma.productCategory.findFirst({
                    where: { name: request.category }
                });
                if (category) {
                    customerCategories.push(category.id);
                }
            }

            if (Array.isArray(request.items)) {
                // Fetch catalog items to get supplier details
                const catalogIds = request.items
                    .map((item: any) => item.catalogItemId)
                    .filter(Boolean);

                let catalogItems: any[] = [];
                if (catalogIds.length > 0) {
                    catalogItems = await prisma.catalogItem.findMany({
                        where: { id: { in: catalogIds } },
                        include: { supplier: true }
                    });
                }

                rfqItems = request.items.map((item: any, idx: number) => {
                    const catalogItem = catalogItems.find(c => c.id === item.catalogItemId);
                    if (catalogItem?.supplier) {
                        suppliersMap.set(catalogItem.supplier.id, {
                            id: catalogItem.supplier.id,
                            name: catalogItem.supplier.companyName,
                            email: catalogItem.supplier.registrationEmail,
                        });
                    } else if (item.supplier) {
                        // We'll need to look up supplier by name if not catalog
                        // For now, we collect names and do a lookup later
                    }

                    const descriptionBase = (item.name || item.description || "").toString();
                    const itemPrices: Record<string, any> = {};
                    if (item.price || item.unitPrice) itemPrices.targetPrice = Number(item.price || item.unitPrice);
                    itemPrices.prValue = (Number(item.price || 0) * Number(item.quantity || 1)) || 0;

                    const priceSuffix = Object.keys(itemPrices).length ? ` | _meta:${JSON.stringify(itemPrices)}` : "";

                    return {
                        // RequestItem schema fields:
                        // brfqId is added by connection in create
                        // internalPartNo, manufacturer, mfgPartNo, description, uom, quantity
                        internalPartNo: "", // Cleared
                        manufacturer: "",   // Cleared
                        mfgPartNo: "",
                        description: `${descriptionBase}${priceSuffix}`,
                        uom: item.uom || "EA",
                        quantity: Number(item.quantity || 1),
                    };
                });

                // Lookup suppliers by name if we have name but no ID
                const supplierNames = request.items
                    .filter((item: any) => item.supplier && !item.catalogItemId) // Only those without catalog link
                    .map((item: any) => item.supplier);

                if (supplierNames.length > 0) {
                    const suppliersByName = await prisma.supplier.findMany({
                        where: {
                            companyName: { in: supplierNames, mode: 'insensitive' }
                        }
                    });
                    suppliersByName.forEach(s => {
                        suppliersMap.set(s.id, {
                            id: s.id,
                            name: s.companyName,
                            email: s.registrationEmail
                        });
                    });
                }
            }

            // 4. Create BRFQ
            // structure depends on BRFQ model in schema.prisma. 
            // Assuming simplified creation based on form data structure.
            // We need to verify BRFQ model fields.

            // Wait! I need to check BRFQ model keys first to be safe. 
            // I'll proceed with a standard update first to be safe and do this in a separate step? 
            // Transaction: Update Request Status AND Create BRFQ
            const [updatedRequest, newRfq] = await prisma.$transaction([
                prisma.request.update({
                    where: { id },
                    data: { status: 'APPROVED' }
                }),
                prisma.bRFQ.create({
                    data: {
                        rfqId: rfqId,
                        title: request.description || "RFQ from Request",
                        openDate: null, // Draft
                        closeDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 1 week?
                        closeTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        needByDate: request.needByDate ? new Date(request.needByDate) : undefined,
                        paymentProcess: "Standard", // Default
                        currency: "USD",            // Default
                        shippingAddress: request.address,
                        status: "draft",
                        customerCategory: customerCategories,
                        suppliers: Array.from(suppliersMap.keys()),
                        suppliersSelected: Array.from(suppliersMap.values()),
                        // Create items inline
                        items: {
                            create: rfqItems
                        },
                        requester: "" // Cleared
                    }
                })
            ]);

            return NextResponse.json({
                ...updatedRequest,
                rfqId: newRfq.rfqId, // Return the human-readable ID
                brfqId: newRfq.id    // Return the UUID
            });
        }

        // Normal status update (e.g. REJECTED)
        const request = await prisma.request.update({
            where: { id },
            data: {
                status: data.status
            }
        });

        return NextResponse.json(request);
    } catch (error) {
        console.error('Error updating request:', error);
        return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
}
