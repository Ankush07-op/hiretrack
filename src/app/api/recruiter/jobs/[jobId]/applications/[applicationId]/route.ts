// A recruiter updates the status of a candidate's application.
/*Accept an application
  Reject an application
  Move it to Interview
  Update only valid statuses
  Ensure the application belongs to one of their jobs
*/
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role, ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const session = await auth();

    // Authentication
    if (!session) {
      return NextResponse.json(
        {
          message: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    // Authorization
    if (session.user.role !== Role.RECRUITER) {
      return NextResponse.json(
        {
          message: "Only recruiter is alllowed to update the application.",
        },
        {
          status: 403,
        }
      );
    }

    // Fetch the application
    const application = await prisma.application.findUnique({
      where: {
        id: params.applicationId,
      },
      select: {
        id: true,
        status: true,

        job: {
          select: {
            createdById: true,
          },
        },
      },
    });

    // Application exists?
    if (!application) {
      return NextResponse.json(
        {
          message: "Application not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Ownership validation
    if (application.job.createdById !== session.user.id) {
      return NextResponse.json(
        {
          message: "You are not allowed to update this application.",
        },
        {
          status: 403,
        }
      );
    }

    // Enum Validation
    const body = await request.json();
    const { status: newStatus } = body;

    const isValidStatus = Object.values(ApplicationStatus).some(
      (value) => value === newStatus
    );

    if (!isValidStatus) {
      return NextResponse.json(
        {
          message: "Invalid application status.",
        },
        {
          status: 400,
        }
      );
    }

    const status = newStatus as ApplicationStatus;

    // Business Rule
    if (
      application.status === ApplicationStatus.HIRED ||
      application.status === ApplicationStatus.REJECTED
    ) {
      return NextResponse.json(
        {
          message: "Application status can no longer be changed.",
        },
        {
          status: 409,
        }
      );
    }

    // Duplicate Status
    if (application.status === status) {
      return NextResponse.json(
        {
          message: "Application already has this status.",
        },
        {
          status: 409,
        }
      );
    }

    const updatedApplication = await prisma.application.update({
      where: {
        id: params.applicationId,
      },
      data: {
        status,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Application updated successfully.",
        application: updatedApplication,
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