// Add one experience to a resume.
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
          message: "Only candidate can create resume.",
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

    // Read the body
    const body = await await request.json();

    const {
      companyName,
      jobTitle,
      location,
      description,
      startDate,
      endDate,
      currentlyWorking = false,
    } = body;

    // Validate Strings
    const requiredFields = [
      { value: companyName, name: "Company name" },
      { value: jobTitle, name: "Job title" },
      { value: location, name: "Location" },
    ];

    for (const field of requiredFields) {
      if (
        typeof field.value !== "string" ||
        field.value.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: `${field.name} is required.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    // Validate Description
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

    // Validate Dates
    const parsedStartDate = new Date(startDate);

    const parsedEndDate = endDate
      ? new Date(endDate)
      : null;
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

    // Validate currentlyWorking
    if (typeof currentlyWorking !== "boolean") {
      return NextResponse.json(
        {
          message: "currentlyWorking must be boolean.",
        },
        {
          status: 400,
        }
      );
    }

    // Validate endDate
    if (currentlyWorking && endDate) {
      return NextResponse.json(
        {
          message: "End date should not be provided for a current job.",
        },
        {
          status: 400,
        }
      );
    }

    if (!currentlyWorking && !endDate) {
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

      if (parsedEndDate < parsedStartDate) {
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

    // Duplicate Experience Check
    const existingExperience = await prisma.experience.findFirst({
      where: {
        resumeId: params.resumeId,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        startDate: parsedStartDate,
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

    // Create Experience
    const experience = await prisma.experience.create({
      data: {
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        location: location.trim(),
        description,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        currentlyWorking,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        location: true,
        startDate: true,
        endDate: true,
        currentlyWorking: true,
        createdAt: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Experience added successfully.",
        experience,
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