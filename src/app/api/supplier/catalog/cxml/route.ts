
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";
import { XMLParser } from "fast-xml-parser";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { supplier: true },
        });

        if (!user?.supplier) {
            return NextResponse.json({ error: "Supplier profile not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const xmlText = await file.text();
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        const result = parser.parse(xmlText);

        // Basic cXML validation/navigation
        // Assuming structure: cXML -> Message -> Transaction -> Catalog -> CatalogItem[]
        // Note: cXML structure can vary (Request -> CatalogUploadRequest, etc.)
        // We'll target the standard Catalog output.

        let catalogItems = [];

        // Handle different cXML paths
        if (result.cXML?.Message?.Transaction?.Catalog?.CatalogItem) {
            catalogItems = result.cXML.Message.Transaction.Catalog.CatalogItem;
        } else if (result.cXML?.Request?.CatalogUploadRequest?.Catalog?.CatalogItem) {
            catalogItems = result.cXML.Request.CatalogUploadRequest.Catalog.CatalogItem;
        }

        if (!Array.isArray(catalogItems)) {
            catalogItems = [catalogItems]; // Handle single item case
        }

        if (catalogItems.length === 0) {
            return NextResponse.json({ error: "No items found in cXML" }, { status: 400 });
        }

        // Pre-fetch masters for mapping (simple caching)
        const currencies = await prisma.currency.findMany();
        const uoms = await prisma.uom.findMany();
        const categories = await prisma.productCategory.findMany();

        // Helper to find ID with flexible matching
        const findCurrencyId = (code: string) => currencies.find(c => c.name.toUpperCase() === code?.toUpperCase())?.id;

        const findUomId = (code: string) => {
            if (!code) return undefined;
            // Try exact match
            let uom = uoms.find(u => u.name === code);
            if (uom) return uom.id;

            // Try common mappings
            if (code === "EA" || code === "PCE") return uoms.find(u => u.name === "EACH")?.id;
            if (code === "KGM") return uoms.find(u => u.name === "KG")?.id;

            return undefined;
        };

        const findCategoryId = (classification: string, description: string) => {
            // 1. Try exact match on classification
            let cat = categories.find(c => c.name === classification);
            if (cat) return cat.id;

            // 2. Try partial match on description
            if (description) {
                const words = description.split(" ");
                for (const word of words) {
                    if (word.length > 3) {
                        cat = categories.find(c => c.name.toLowerCase().includes(word.toLowerCase()));
                        if (cat) return cat.id;
                    }
                }
            }

            // Default to first available if nothing matches
            return categories[0]?.id;
        };

        const processedItems = [];
        const errors = [];

        for (const item of catalogItems) {
            try {
                const supplierPartId = item.SupplierPartID;
                const itemDetail = item.ItemDetail;
                const description = itemDetail.Description["#text"] || itemDetail.Description;
                const unitPrice = itemDetail.UnitPrice.Money["#text"] || itemDetail.UnitPrice.Money;
                const currencyCode = itemDetail.UnitPrice.Money["@_currency"];
                const uomCode = itemDetail.UnitOfMeasure;
                const classification = itemDetail.Classification["#text"] || itemDetail.Classification;

                const currencyId = findCurrencyId(currencyCode);
                const uomId = findUomId(uomCode);
                const categoryId = findCategoryId(classification, description);

                if (!currencyId) throw new Error(`Currency ${currencyCode} not supported`);
                if (!uomId) throw new Error(`UOM ${uomCode} not supported`);
                if (!categoryId) throw new Error(`Category not found for ${classification}`);

                // Upsert Item
                const upserted = await prisma.catalogItem.upsert({
                    where: {
                        // We don't have a unique constraint on supplierPartId + supplierId yet, 
                        // so we might need to find first. 
                        // PRISMA NOTE: upsert requires unique where. 
                        // Since we don't have it, we'll use findFirst/create/update manually or add unique constraint.
                        // For now, let's just create or update by searching.
                        id: "non-existent" // Hack to force manual check below
                    },
                    update: {},
                    create: {
                        supplierId: user.supplier.id,
                        itemType: "Goods", // Default
                        description,
                        quantity: 1, // Default availability
                        price: parseFloat(unitPrice),
                        supplierPartId,
                        currencyId,
                        uomId,
                        categoryId
                    }
                });
                // Real logic:
                const existing = await prisma.catalogItem.findFirst({
                    where: {
                        supplierId: user.supplier.id,
                        supplierPartId: supplierPartId
                    }
                });

                if (existing) {
                    await prisma.catalogItem.update({
                        where: { id: existing.id },
                        data: {
                            description,
                            price: parseFloat(unitPrice),
                            currencyId,
                            uomId,
                            categoryId
                        }
                    });
                } else {
                    await prisma.catalogItem.create({
                        data: {
                            supplierId: user.supplier.id,
                            itemType: "Goods",
                            description,
                            quantity: 1,
                            price: parseFloat(unitPrice),
                            supplierPartId,
                            currencyId,
                            uomId,
                            categoryId
                        }
                    });
                }
                processedItems.push(supplierPartId);

            } catch (e: any) {
                console.error("Item Error:", e);
                errors.push({ id: item.SupplierPartID, error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            processed: processedItems.length,
            errors: errors
        });

    } catch (error) {
        console.error("Error processing cXML:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
