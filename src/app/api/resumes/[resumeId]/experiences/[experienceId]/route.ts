// Update Experience
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { resumeId: string, experienceId: string } }
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
          message: "Only candidate can update resume.",
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

    // Experience Ownership Validation
    const experience = await prisma.experience.findFirst({
      where: {
        id: params.experienceId,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        location: true,
        description: true,
        startDate: true,
        endDate: true,
        currentlyWorking: true,
      },
    });

    if (!experience) {
      return NextResponse.json(
        {
          message: "Experience not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Read the body
    const body = await request.json();

    const {
      companyName,
      jobTitle,
      location,
      description,
      startDate,
      endDate,
      currentlyWorking,
    } = body;

    // Partial Validation
    const data: Prisma.ExperienceUpdateInput = {};

    if (companyName !== undefined) {

      if (
        typeof companyName !== "string" ||
        companyName.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Company name is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.companyName = companyName.trim();
    }

    if (jobTitle !== undefined) {

      if (
        typeof jobTitle !== "string" ||
        jobTitle.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Job title is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.jobTitle = jobTitle.trim();
    }

    if (location !== undefined) {

      if (
        typeof location !== "string" ||
        location.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Location is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.location = location.trim();
    }

    // Validate Description
    if (description !== undefined) {

      if (
        !Array.isArray(description) ||
        description.length === 0 ||
        description.some(
          (point) =>
            typeof point !== "string" ||
            point.trim().length === 0
        )
      ) {
        return NextResponse.json(
          {
            message: "Description must be a non-empty array of strings.",
          },
          {
            status: 400,
          }
        );
      }

      data.description = description;
    }

    const parsedStartDate =
      startDate
        ? new Date(startDate)
        : undefined;

    if (startDate !== undefined) {

      if (parsedStartDate) {
        data.startDate = parsedStartDate;
      }
    }

    const parsedEndDate =
      endDate
        ? new Date(endDate)
        : undefined;

    if (endDate !== undefined) {

      if (parsedEndDate) {
        data.endDate = parsedEndDate;
      }
    }

    if (currentlyWorking !== undefined) {

      if (
        typeof currentlyWorking !== "boolean"
      ) {
        return NextResponse.json(
          {
            message: "currentlyWorking must be a boolean.",
          },
          {
            status: 400,
          }
        );
      }

      data.currentlyWorking = currentlyWorking;
    }

    const effectiveCompanyName =
      companyName?.trim() ??
      experience.companyName;

    const effectiveJobTitle =
      jobTitle?.trim() ??
      experience.jobTitle;

    const effectiveStartDate =
      parsedStartDate ??
      experience.startDate;

    const effectiveEndDate =
      parsedEndDate ??
      experience.endDate;

    const effectiveCurrentlyWorking =
      currentlyWorking ??
      experience.currentlyWorking;

    // Duplicate Experience Check
    const existingExperience = await prisma.experience.findFirst({
      where: {
        resumeId: params.resumeId,
        companyName: effectiveCompanyName,
        jobTitle: effectiveJobTitle,
        startDate: effectiveStartDate,
        NOT: {
          id: params.experienceId,
        }
      },
    });

    if (existingExperience) {
      return NextResponse.json(
        {
          message: "Experience already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // Validate Dates
    if (
      parsedStartDate &&
      Number.isNaN(parsedStartDate.getTime())
    ) {
      return NextResponse.json(
        {
          message: "Invalid start date.",
        },
        {
          status: 400,
        }
      );
    }

    // Validate endDate
    if (effectiveCurrentlyWorking && effectiveEndDate) {
      return NextResponse.json(
        {
          message: "End date should not be provided for a current job.",
        },
        {
          status: 400,
        }
      );
    }

    if (!effectiveCurrentlyWorking && !effectiveEndDate) {
      return NextResponse.json(
        {
          message: "End date is required when currentlyWorking is false.",
        },
        {
          status: 400,
        }
      );
    }

    if (parsedEndDate) {
      if (Number.isNaN(parsedEndDate.getTime())) {
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

    const updatedExperience = await prisma.experience.update({
      where: {
        id: params.experienceId,
      },
      data,
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        location: true,
        description: true,
        startDate: true,
        endDate: true,
        currentlyWorking: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Experience updated successfully.",
        experience: updatedExperience,
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