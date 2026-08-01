// Update Education
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { resumeId: string, educationId: string } }
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

    // Education Ownership Validation
    const education = await prisma.education.findFirst({
      where: {
        id: params.educationId,
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
      },
    });

    if (!education) {
      return NextResponse.json(
        {
          message: "Education not found.",
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
      instituteName,
      fieldOfStudy,
      grade,
      startDate,
      endDate,
      currentlyStudying,
    } = body;

    // Partial Validation
    const data: Prisma.EducationUpdateInput = {};

    if (degree !== undefined) {

      if (
        typeof degree !== "string" ||
        degree.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Degree is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.degree = degree.trim();
    }

    if (instituteName !== undefined) {

      if (
        typeof instituteName !== "string" ||
        instituteName.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Institute name is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.instituteName = instituteName.trim();
    }

    if (fieldOfStudy !== undefined) {

      if (
        typeof fieldOfStudy !== "string"
      ) {
        return NextResponse.json(
          {
            message: "Field of study must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      data.fieldOfStudy = fieldOfStudy.trim().length > 0
        ? fieldOfStudy.trim()
        : null;
    }

    if (grade !== undefined) {
      if (typeof grade !== "string") {
        return NextResponse.json(
          {
            message: "Grade must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      data.grade =
        grade.trim().length > 0
          ? grade.trim()
          : null;
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

    if (currentlyStudying !== undefined) {

      if (
        typeof currentlyStudying !== "boolean"
      ) {
        return NextResponse.json(
          {
            message: "currentlyStudying must be a boolean.",
          },
          {
            status: 400,
          }
        );
      }

      data.currentlyStudying = currentlyStudying;
    }

    const effectiveDegree =
      degree?.trim() ??
      education.degree;

    const effectiveInstituteName =
      instituteName?.trim() ??
      education.instituteName;

    const effectiveStartDate =
      parsedStartDate ??
      education.startDate;

    const effectiveEndDate =
      parsedEndDate ??
      education.endDate;

    const effectiveCurrentlyStudying =
      currentlyStudying ??
      education.currentlyStudying;

    // Duplicate Education Check
    const existingEducation = await prisma.education.findFirst({
      where: {
        resumeId: params.resumeId,
        degree: effectiveDegree,
        instituteName: effectiveInstituteName,
        startDate: effectiveStartDate,
        NOT: {
          id: params.educationId,
        }
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
    if (effectiveCurrentlyStudying && effectiveEndDate) {
      return NextResponse.json(
        {
          message: "End date should not be provided for a currentlyStudying is true.",
        },
        {
          status: 400,
        }
      );
    }

    if (!effectiveCurrentlyStudying && !effectiveEndDate) {
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

    const updatedEducation = await prisma.education.update({
      where: {
        id: params.educationId,
      },
      data,
      select: {
        id: true,
        degree: true,
        instituteName: true,
        fieldOfStudy: true,
        grade: true,
        startDate: true,
        endDate: true,
        currentlyStudying: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Education updated successfully.",
        education: updatedEducation,
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