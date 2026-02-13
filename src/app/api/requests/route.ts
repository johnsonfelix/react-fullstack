import { NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function GET() {
    try {
        const requests = await prisma.request.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(requests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const data = await req.json();

        // Auto-create category if it doesn't exist
        if (data.category && typeof data.category === 'string' && data.category.trim() !== '') {
            const categoryName = data.category.trim();
            const existingCategory = await prisma.productCategory.findFirst({
                where: {
                    name: {
                        equals: categoryName,
                        mode: 'insensitive'
                    }
                }
            });

            if (!existingCategory) {
                try {
                    await prisma.productCategory.create({
                        data: {
                            name: categoryName
                        }
                    });
                } catch (catError) {
                    console.error('Error auto-creating category:', catError);
                    // Continue with request creation even if category creation fails
                }
            }
        }

        const request = await prisma.request.create({
            data: {
                description: data.description || '',
                requestType: data.requestType || 'goods',
                category: data.category || '',
                address: data.address || null,
                estimatedValue: data.value || null, // Mapping 'value' from draft to 'estimatedValue'
                needByDate: data.needByDate || null,
                items: data.items || [],
                status: 'PENDING'
            }
        });
        return NextResponse.json(request);
    } catch (error) {
        console.error('Error creating request:', error);
        return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }
}
