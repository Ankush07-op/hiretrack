import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        // Read Credentials
        const email = credentials.email as string;
        const password = credentials.password as string;

        // Validation
        if (!email || !password) {
          return null;
        }
            
        
        // Find User
        const user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

        if (!user) {
          return null;
        }

        // Compare Password
        const isPasswordCorrect = await bcrypt.compare(
          password,
          user.password
        );

        if (!isPasswordCorrect) {
          return null;
        }

        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.fullName = user.fullName;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.fullName = token.fullName;
        session.user.role = token.role;
      }

      return session;
    },
  }
});