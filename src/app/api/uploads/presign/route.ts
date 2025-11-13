import { NextResponse } from "next/server";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

const REGION = process.env.S3_UPLOAD_REGION!;
const BUCKET = process.env.S3_UPLOAD_BUCKET!;
const PREFIX = (process.env.S3_UPLOAD_PREFIX || "").replace(/^\/+|\/+$/g, "");
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE;

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID!,
    secretAccessKey: process.env.SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: "filename is required" }, { status: 400 });
    }

    // we no longer enforce an exact Content-Type in the policy
    const ext = (filename.split(".").pop() || "bin").toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const key = PREFIX ? `${PREFIX}/${safeName}`.replace(/\/+/g, "/") : safeName;

    const { url, fields } = await createPresignedPost(s3, {
      Bucket: BUCKET,
      Key: key,
      Conditions: [
        ["content-length-range", 0, 10 * 1024 * 1024],
        ["starts-with", "$Content-Type", ""], // ✅ allow any content type value provided by client
      ],
      // DO NOT put Content-Type in Fields (that would force an "eq" condition)
      Fields: {
        // optionally: "success_action_status": "201"
      },
      Expires: 60,
    });

    const publicUrl = PUBLIC_BASE
      ? `${PUBLIC_BASE.replace(/\/+$/,"")}/${key}`
      : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    return NextResponse.json({ url, fields, key, publicUrl });
  } catch (err: any) {
    console.error("presign error:", err);
    return NextResponse.json({ error: "Failed to create presigned post" }, { status: 500 });
  }
}
