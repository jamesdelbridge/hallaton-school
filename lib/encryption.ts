import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const encoded = process.env.DATA_ENCRYPTION_KEY;
  if (!encoded) throw new Error("DATA_ENCRYPTION_KEY must be configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("DATA_ENCRYPTION_KEY must decode to exactly 32 bytes");
  return key;
}

export function encryptPrivateData(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64")).join(".");
}

export function decryptPrivateData(value: string) {
  const [encodedIv, encodedTag, encodedData] = value.split(".");
  if (!encodedIv || !encodedTag || !encodedData) throw new Error("Encrypted data is malformed");
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encodedIv, "base64"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedData, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
