import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: { signIn: "/staff/sign-in" },
  providers: [
    CredentialsProvider({
      name: "School account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = credentials?.email ? await db.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
        }) : null;
        if (!credentials?.password || !user?.passwordHash || !user.active || !(await compare(credentials.password, user.passwordHash))) {
          await db.auditLog.create({ data: {
            actorId: user && user.role !== "PARENT" ? user.id : null,
            action: "SIGN_IN_FAILED",
            entityType: "Authentication",
            entityId: "sign-in",
          } });
          return null;
        }
        if (user.role !== "PARENT") await db.auditLog.create({ data: { actorId: user.id, action: "SIGN_IN", entityType: "User", entityId: user.id } });
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "role" in user) token.role = user.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (!token.role) throw new Error("The school account has no assigned access role.");
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sub && message.token.role && message.token.role !== "PARENT") {
        await db.auditLog.create({ data: { actorId: message.token.sub, action: "SIGN_OUT", entityType: "Authentication", entityId: "sign-out" } });
      }
    },
  },
};
