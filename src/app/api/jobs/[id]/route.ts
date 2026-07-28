// The candidate can browse jobs.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    
    const job = await prisma.job.findUnique({
      where: {
        id: params.id,
      },
      select: {
        title: true,
        description: true,
        skillRequirements: true,
        salaryMin: true,
        salaryMax: true,
        location: true,
        numberOfOpenings: true,
        employmentType: true,
        applicationDeadline: true,
        status: true,
        createdAt: true,
        company: {
          select: {
            name: true,
            logo: true,
            website: true,
          },
        },
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

    if (job.status === JobStatus.DRAFT) {
      return NextResponse.json(
        {
          message: "Job does not exists.",
        },
        {
          status: 404,
        }
      );
    }

    if (job.applicationDeadline) {
    
      const now = new Date();

      if (now > job.applicationDeadline) {
        return NextResponse.json(
          {
            message: "Job application is closed.",
          },
          {
            status: 409,
          }
        );
      }
    }
    
    return NextResponse.json(
      {
        job,
      },
      {
        status: 200,
      }
    );

  } catch(error) {
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