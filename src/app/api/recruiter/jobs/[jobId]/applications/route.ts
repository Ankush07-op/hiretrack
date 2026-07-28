// Recruiter sees only jobs they created with their respective applications.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    // Authentication
    const session = await auth();

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
          message: "Only recruiters can view job applications.",
        },
        {
          status: 403,
        }
      );
    }

    // Pagination
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "10");
  
    if (Number.isNaN(page) || page <= 0) {
      return NextResponse.json(
        {
          message: "Page number must be greater than 0."
        },
        {
          status: 400,
        }
      );
    }
    
    if (Number.isNaN(limit) || limit <= 0 || limit > 50) {
      return NextResponse.json(
        {
          message: "Limit must be between 1 and 50."
        },
        {
          status: 400,
        }
      );
    }
    
    const skip = (page - 1) * limit;
    
    // Ownership Validation
    const job = await prisma.job.findFirst({
      where: {
        id: params.jobId,
        createdById: session.user.id,
      },
      select: {
        id: true,
        createdById: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          message: "Job not found.",
        },
        {
          status: 404,
        }
      );
    } 

    const [totalApplications, applications] = await Promise.all([
      prisma.application.count({
        where: {
          jobId: params.jobId,
        },
      }),

      prisma.application.findMany({
        // Pagination Query
        skip,
        take: limit,
        where: {
          jobId: params.jobId,
        },
        // Ordering
        orderBy: {
          appliedAt: "desc",
        },
        select: {
          id: true,
          appliedAt: true,
          status: true,
          candidate: {
            select: {
              fullName: true,
              email: true,
            }
          },
          resume: {
            select: {
              resumeUrl: true,
            }
          }
        }
      })
    ]);

    const totalPages = Math.ceil(totalApplications / limit);

    return NextResponse.json(
      {
        applications,
        pagination: {
          page,
          limit,
          totalApplications,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
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