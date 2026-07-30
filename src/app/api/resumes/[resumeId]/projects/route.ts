// Create Project Entry
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { resumeId: string } }
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
    if (session.user.role !== Role.CANDIDATE){
      return NextResponse.json(
        {
          message: "Only candidates can add projects.",
        },
        {
          status: 403,
        }
      );
    }

    // Ownership Validation
    const resume = await prisma.resume.findFirst({
      where: {
        id: params.resumeId,
        candidateId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        {
          message: "Resume not found.",
        },
        {
          status: 404,
        }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      githubUrl,
      liveUrl,
      techStack,
      startDate,
      endDate,
    } = body;

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }
    
    const normalizedTitle = title.trim();

    if (description !== undefined && typeof description !== "string"
    ) {
      return NextResponse.json(
        { message: "Description must be a string." },
        { status: 400 }
      );
    }

    const normalizedDescription =
      typeof description === "string" &&
      description.trim().length > 0
        ? description.trim()
        : null;

    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    const normalizedGithubUrl =
      typeof githubUrl === "string" &&
      githubUrl.trim().length > 0
        ? githubUrl.trim()
        : null;

    if (normalizedGithubUrl && !isValidUrl(normalizedGithubUrl)
    ) {
      return NextResponse.json(
        { message: "Invalid GitHub URL." },
        { status: 400 }
      );
    }

    const normalizedLiveUrl =
      typeof liveUrl === "string" &&
      liveUrl.trim().length > 0
        ? liveUrl.trim()
        : null;

    if (normalizedLiveUrl && !isValidUrl(normalizedLiveUrl)
    ) {
      return NextResponse.json(
        { message: "Invalid Live URL." },
        { status: 400 }
      );
    }

    // Tech Stack validation
    if (
      techStack !== undefined &&
      (
        !Array.isArray(techStack) ||
        techStack.length === 0 ||
        techStack.some(
          (teck) =>
            typeof teck !== "string" ||
            teck.trim().length === 0
        )
      )
    ) {
      return NextResponse.json(
        {
          message: "Tech Stack must be a non-empty array of strings.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedTechStack =
      Array.isArray(techStack)
        ? techStack.join(", ")
        : null;

    const parsedStartDate =
      startDate
        ? new Date(startDate)
        : null;

    if (parsedStartDate) {
      if (Number.isNaN(parsedStartDate.getTime())) {
        return NextResponse.json(
          {
            message: "Invalid start date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const parsedEndDate =
      endDate
        ? new Date(endDate)
        : null;

    if (parsedEndDate) {
      if (Number.isNaN(parsedEndDate?.getTime())) {
        return NextResponse.json(
          {
            message: "Invalid end date.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        parsedStartDate &&
        parsedEndDate &&
        parsedEndDate < parsedStartDate
      ) {
        return NextResponse.json(
          {
            message: "End date cannot be before start date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const existingProject = await prisma.project.findFirst({
      where: {
        resumeId: params.resumeId,
        title: normalizedTitle,
        githubUrl: normalizedGithubUrl,
      },
    });

    if (existingProject) {
      return NextResponse.json(
        {
          message: "Project already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const project = await prisma.project.create({
      data: {
        title: normalizedTitle,
        description: normalizedDescription,
        githubUrl: normalizedGithubUrl,
        liveUrl: normalizedLiveUrl,
        techStack: normalizedTechStack,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
        title: true,
        githubUrl: true,
        liveUrl: true,
        techStack: true,
        createdAt: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Project added successfully.",
        project,
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