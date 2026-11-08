import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "../lib/db";

loadEnvConfig(process.cwd());

async function main() {
  const name = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 14 || password.length > 72) {
    throw new Error("Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of 14–72 characters.");
  }
  const adminCount = await db.user.count({ where: { role: Role.SUPER_ADMIN } });
  if (adminCount > 0) throw new Error("A super-admin already exists; use the portal to manage accounts.");
  await db.user.create({
    data: { name, email, passwordHash: await hash(password, 12), role: Role.SUPER_ADMIN },
  });
  console.info(`Created initial super-admin account for ${email}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Admin bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(async () => db.$disconnect());
