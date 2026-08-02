// Create resume
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // Authentication
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        {
          message: "Login required.",
        },
        {
          status: 401,
        }
      );
    }

    // Authorization
    if (session.user.role !== Role.CANDIDATE){
      return NextResponse.json(
        {
          message: "Only candidate can create resume.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const {
      title,
    } = body;

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Title must be a non-empty string.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedTitle = title.trim();

    // Validation for duplicate title
    const existingResume = await prisma.resume.findFirst({
      where: {
        candidateId: session.user.id,
        title: normalizedTitle,
      },
    });

    if (existingResume) {
      return NextResponse.json(
        {
          message: "Resume already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const resume = await prisma.resume.create({
      data: {
        title: normalizedTitle,
        candidateId: session.user.id,
      },
      select: {
        id: true,
        title: true,
      }
    });

    return NextResponse.json(
      {
        message: "Resume created successfully.",
        resume,
      },
      {
        status: 201,
      }
    );

  } catch(error) {
    console.log(error);

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

// Returns all resumes of the logged-in candidate.
// This endpoint allows a candidate to view all of their resumes.
export async function GET(request: Request) {
  try{

    // Authentication
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        {
          message: "Login required.",
        },
        {
          status: 401,
        }
      );
    }

    // Authorization
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates are allowed to view their created resumes.",
        },
        {
          status: 403,
        }
      );
    }

    const resumes = await prisma.resume.findMany({
      where: {
        candidateId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        summary: true,
        githubUrl: true,
        linkedinUrl: true,
        resumeUrl: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json(
      {
        resumes,
      },
      {
        status: 200,
      }
    );

  } catch(error){
    console.log(error);

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