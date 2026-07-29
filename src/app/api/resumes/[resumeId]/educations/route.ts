// Create Education Entry
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
          message: "Only candidates can add education.",
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
    const body = await request.json();

    const {
      degree,
      fieldOfStudy,
      instituteName,
      grade,
      startDate,
      endDate,
      currentlyStudying = false,
    } = body;

    // Validate Strings
    const requiredFields = [
      { value: degree, name: "Degree name" },
      { value: instituteName, name: "Name of Institute" },
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

    const normalizedDegree = degree.trim();
    const normalizedInstitute = instituteName.trim();

    if (
      fieldOfStudy !== undefined &&
      typeof fieldOfStudy !== "string"
    ) {
      return NextResponse.json(
        { message: "Field of study must be a string." },
        { status: 400 }
      );
    }

    if (
      grade !== undefined &&
      typeof grade !== "string"
    ) {
      return NextResponse.json(
        { message: "Grade must be a string." },
        { status: 400 }
      );
    }

    const normalizedFieldOfStudy =
      typeof fieldOfStudy === "string" && fieldOfStudy.trim().length > 0
        ? fieldOfStudy.trim()
        : null;

    const normalizedGrade =
      typeof grade === "string" && grade.trim().length > 0
        ? grade.trim()
        : null;

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

    // Validate currentlyStudying
    if (typeof currentlyStudying !== "boolean") {
      return NextResponse.json(
        {
          message: "currentlyStudying must be boolean.",
        },
        {
          status: 400,
        }
      );
    }

    // Validate endDate
    if (currentlyStudying && endDate) {
      return NextResponse.json(
        {
          message: "End date should not be provided when currentlyStudying is true.",
        },
        {
          status: 400,
        }
      );
    }

    if (!currentlyStudying && !endDate) {
      return NextResponse.json(
        {
          message: "End date is required when currentlyStudying is false.",
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

    // Duplicate Education Check
    const existingEducation = await prisma.education.findFirst({
      where: {
        resumeId: params.resumeId,
        degree: normalizedDegree,
        instituteName: normalizedInstitute,
        startDate: parsedStartDate,
      },
    });

    if (existingEducation) {
      return NextResponse.json(
        {
          message: "Education already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // Create Education
    const education = await prisma.education.create({
      data: {
        degree: normalizedDegree,
        instituteName: normalizedInstitute,
        fieldOfStudy: normalizedFieldOfStudy,
        grade: normalizedGrade,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        currentlyStudying,
        resumeId: params.resumeId,
      },
      select: {
        id: true,
        degree: true,
        instituteName: true,
        fieldOfStudy: true,
        grade: true,
        startDate: true,
        endDate: true,
        currentlyStudying: true,
        createdAt: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Education added successfully.",
        education,
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