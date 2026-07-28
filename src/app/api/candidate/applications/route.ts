/*This will let a candidate see:
  Which jobs they applied to.
  The current status (UNDER_REVIEW, INTERVIEW, REJECTED, etc.).
  When they applied.
  Which company/job it belongs to.
*/
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
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
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates can view their applications.",
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

    const [totalApplications, applications] = await Promise.all([
      prisma.application.count({
        where: {
          candidateId: session.user.id,
        },
      }),
      
      prisma.application.findMany({
        where: {
          candidateId: session.user.id, 
        },
        skip,
        take: limit,
        orderBy: {
          appliedAt: "desc",
        },
        select: {
          status: true,
          appliedAt: true,
          job: {
            select: {
              title: true,
              company: {
                select: {
                  name: true,
                  logo: true,
                }
              }
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