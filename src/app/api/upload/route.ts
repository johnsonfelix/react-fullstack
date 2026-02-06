import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const S3_BUCKET = process.env.S3_BUCKET || "inventory-projects-cerchilo";
const S3_REGION = process.env.AWS_REGION || process.env.REGION || "ap-south-1";
const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

const s3 = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || "",
    }
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique key
        const uniqueId = Math.random().toString(36).substring(2, 9);
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const key = `uploads/${Date.now()}_${uniqueId}_${sanitizedName}`;

        const command = new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type,
        });

        await s3.send(command);

        const url = `${S3_BASE_URL}${key}`;
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + " MB";

        return NextResponse.json({
            url,
            name: file.name,
            type: file.type.includes("pdf") ? "pdf" : "other", // Simple type mapping for icon logic
            size: sizeMB,
            uploadedAt: new Date().toLocaleDateString()
        });

    } catch (err: any) {
        console.error("Upload error details:", {
            message: err.message,
            code: err.Code,
            requestId: err.RequestId,
            httpStatusCode: err.$metadata?.httpStatusCode,
            stack: err.stack,
            envStart: {
                hasBucket: !!process.env.S3_BUCKET,
                hasRegion: !!(process.env.AWS_REGION || process.env.REGION),
                hasAccessKey: !!(process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID),
                hasSecretKey: !!(process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY),
                region: S3_REGION
            }
        });
        return NextResponse.json({ error: "Upload failed: " + err.message }, { status: 500 });
    }
}
