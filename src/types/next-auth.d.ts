import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      fullName: string;
      role: string;
    } & DefaultSession["user"];

  }

  interface User {
    id: string;
    fullName: string;
    role: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    fullName: string;
    role: string;
  }
}