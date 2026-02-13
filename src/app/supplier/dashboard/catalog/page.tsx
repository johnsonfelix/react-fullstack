
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/app/prisma";
import { redirect } from "next/navigation";
import CatalogClient from "@/components/supplier/catalog/CatalogClient";

export default async function CatalogPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        redirect("/sign-in");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        include: { supplier: true },
    });

    if (!user?.supplier) {
        // Handle case where user is not a supplier or doesn't have a profile
        return <div>Supplier profile not found.</div>;
    }

    // Fetch data in parallel
    const [items, categories, uoms, currencies] = await Promise.all([
        prisma.catalogItem.findMany({
            where: { supplierId: user.supplier.id },
            include: {
                category: true,
                uom: true,
                currency: true,
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.productCategory.findMany({
            orderBy: { name: 'asc' }
        }),
        prisma.uom.findMany({
            orderBy: { name: 'asc' }
        }),
        prisma.currency.findMany({
            orderBy: { name: 'asc' }
        })
    ]);

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Product Catalog</h1>
                <p className="text-gray-500">Manage your products and services.</p>
            </div>

            <CatalogClient
                items={items}
                categories={categories}
                uoms={uoms}
                currencies={currencies}
            />
        </div>
    );
}
