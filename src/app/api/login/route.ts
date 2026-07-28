import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try{
    const body = await request.json();

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          message: "Email and password are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Find User
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    // Compare Password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return NextResponse.json(
        {
          message: "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    return NextResponse.json(
      {
        message: "Login successful.",
      },
      {
        status: 200,
      }
    );
    
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}