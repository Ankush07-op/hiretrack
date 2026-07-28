import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: Request) {
  try{
    const body = await request.json();

    const {
      fullName,
      email,
      password,
      confirmPassword,
      role,
      phoneNumber,
    } = body;

    // Required field validation
    if (
      !fullName ||
      !email ||
      !password ||
      !confirmPassword ||
      !role
    ) {
      return NextResponse.json(
        {
          message: "All required fields are mandatory.",
        },
        {
          status: 400,
        }
      );
    }

    // Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          message: "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    // Password match validation
    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          message: "Passwords do not match.",
        },
        {
          status: 400,
        }
      );
    } 

    // Email findUniqe()
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          message: "Email is already registered.",
        },
        {
          status: 409,
        }
      );
    }
    
    //Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    //Create User
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        phoneNumber,
        role,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        phoneNumber: true,
        createdAt: true,
      },
    });
    
    //Success Response
    return NextResponse.json(
      {
        message: "User registered successfully.",
        user
      },
      {
        status: 201,
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