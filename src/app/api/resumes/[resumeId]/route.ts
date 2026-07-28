// Update a resume
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates can update resumes.",
        },
        {
          status: 403,
        }
      );
    }

    // Ownership Validation
    const resume = await prisma.resume.findFirst({
      where: {
        id: params.id,
        candidateId: session.user.id,
      },
      select: {
        id: true,
        candidateId: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        {
          message: "Resume doesn't exists.",
        },
        {
          status: 404,
        }
      );
    }

    const body = await request.json();

    const {
      title,
      summary,
      resumeUrl,
      githubUrl,
      linkedinUrl,
    } = body;

    const data: Prisma.ResumeUpdateInput = {};

    // Update title
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          {
            message: "Title must be string.",
          },
          {
            status: 400,
          }
        );
      }

      const normalizedTitle = title.trim();

      // Duplicate title validation
      const existingResume = await prisma.resume.findFirst({
        where: {
          candidateId: session.user.id,
          title: normalizedTitle,
          NOT: {
            id: params.id,
          },
        }
      });

      if (existingResume) {
        return NextResponse.json(
          {
            message: "Resume title already exists.",
          },
          {
            status: 409,
          }
        );
      }

      data.title = normalizedTitle;
    }

    // Optional fields
    if (summary !== undefined) {
      data.summary = summary;
    }

    if (githubUrl !== undefined) {
      data.githubUrl = githubUrl;
    }

    if (linkedinUrl !== undefined) {
      data.linkedinUrl = linkedinUrl;
    }

    if (resumeUrl !== undefined) {
      data.resumeUrl = resumeUrl;
    }

    // Empty update validation
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        {
          message: "At least one field must be provided.",
        },
        {
          status: 400,
        }
      );
    }

    const updatedResume = await prisma.resume.update({
      where: {
        id: params.id,
      },
      data,
      select: {
        id: true,
        title: true,
        summary: true,
        resumeUrl: true,
        githubUrl: true,
        linkedinUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Resume updated successfully.",
        resume: updatedResume,
      },
      {
        status: 200,
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