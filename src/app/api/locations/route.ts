
import { NextResponse } from 'next/server';
import prisma from '@/app/prisma';

export async function GET() {
    try {
        const addresses = await prisma.address.findMany({
            select: {
                id: true,
                line1: true,
                city: true,
                country: true
            }
        });

        // Map to a simplified structure for the frontend
        const formatted = addresses.map(a => ({
            id: a.id,
            name: `${a.line1}, ${a.city}, ${a.country}`,
            address: `${a.line1}, ${a.city}, ${a.country}` // keeping structure compatible
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        console.error('Error fetching addresses:', error);
        return NextResponse.json({ error: 'Failed to fetch addresses' }, { status: 500 });
    }
}
