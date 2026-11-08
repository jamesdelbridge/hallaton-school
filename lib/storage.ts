import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export async function uploadPrivateFile(file: Buffer, contentType: string) {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT } =
    process.env;
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("Private S3 storage is not configured");
  }
  if (!contentType.startsWith("application/pdf") && !contentType.startsWith("image/")) {
    throw new Error("Unsupported file type");
  }
  if (file.byteLength > 10 * 1024 * 1024) throw new Error("File exceeds 10 MB limit");

  const client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT || undefined,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
  const key = `school/${randomUUID()}`;
  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    }),
  );
  return { key };
}
