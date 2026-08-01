// Update Project
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { resumeId: string, projectId: string } }
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
          message: "Only candidates can update projects.",
        },
        {
          status: 403,
        }
      );
    }

    // Resume Ownership Validation
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

    // Project Ownership Validation
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        githubUrl: true,
        liveUrl: true,
        techStack: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          message: "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Read the body
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

    // Partial Validation
    const data: Prisma.ProjectUpdateInput = {};

    if (title !== undefined) {
      if (
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return NextResponse.json(
          { message: "Title is required." },
          { status: 400 }
        );
      }

      data.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return NextResponse.json(
          { message: "Description must be a string." },
          { status: 400 }
        );
      }

      data.description =
        description.trim().length > 0
          ? description.trim()
          : null;
    }

    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    if (githubUrl !== undefined) {
      if (typeof githubUrl !== "string") {
        return NextResponse.json(
          {
            message: "GitHub URL must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        githubUrl.trim().length > 0 &&
        !isValidUrl(githubUrl.trim())
      ) {
        return NextResponse.json(
          { 
            message: "Invalid GitHub URL." 
          },
          { 
            status: 400 
          }
        );
      }

      data.githubUrl =
        githubUrl.trim().length > 0
          ? githubUrl.trim()
          : null;
    }

    if (liveUrl !== undefined) {
      if (typeof liveUrl !== "string") {
        return NextResponse.json(
          {
            message: "Live URL must be a string.",
          },
          {
            status: 400,
          }
        );
      }
      
      if (
        liveUrl.trim().length > 0 &&
        !isValidUrl(liveUrl.trim())
      ) {
        return NextResponse.json(
          { message: "Invalid Live URL." },
          { status: 400 }
        );
      }

      data.liveUrl =
        liveUrl.trim().length > 0
          ? liveUrl.trim()
          : null;
    }

    // Tech Stack validation
    if (techStack !== undefined) {
      if (
        !Array.isArray(techStack) ||
        techStack.length === 0 ||
        techStack.some(
          (teck) =>
            typeof teck !== "string" ||
            teck.trim().length === 0
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

      data.techStack = techStack.join(", ");
    }

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

      data.startDate = parsedStartDate;
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

      data.endDate = parsedEndDate;
    }

    const effectiveStartDate =
      parsedStartDate ??
      project.startDate;

    const effectiveEndDate =
      parsedEndDate ??
      project.endDate;

    if (
      effectiveStartDate &&
      effectiveEndDate &&
      effectiveEndDate < effectiveStartDate
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

    const effectiveTitle =
      title?.trim() ??
      project.title;

    const effectiveGithubUrl =
      githubUrl?.trim() ??
      project.githubUrl;

    // Duplicate Project Check
    const existingProject = await prisma.project.findFirst({
      where: {
        resumeId: params.resumeId,
        title: effectiveTitle,
        githubUrl: effectiveGithubUrl,
        NOT: {
          id: params.projectId,
        }
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

    const updatedProject = await prisma.project.update({
      where: {
        id: params.projectId,
      },
      data,
      select: {
        id: true,
        title: true,
        description: true,
        githubUrl: true,
        liveUrl: true,
        techStack: true,
        startDate: true,
        endDate: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Project updated successfully.",
        project: updatedProject,
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

// Delete Project
export async function DELETE(
  request: Request,
  { params }: { params: { resumeId: string; projectId: string; }; }
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
          message: "Only candidates can delete projects.",
        },
        {
          status: 403,
        }
      );
    }

    // Resume Ownership Validation
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

    // Project Ownership Validation
    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          message: "Project not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Delete Project
    await prisma.project.delete({
      where: {
        id: params.projectId,
      },
    });

    return NextResponse.json(
      {
        message: "Project deleted successfully.",
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