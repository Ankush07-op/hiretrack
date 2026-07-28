// Fetch and display the user's resumes.
// Returns all resumes of the logged-in candidate.
// This endpoint allows a candidate to view all of their resumes.
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
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