// View a single job
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  try{
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

  // Fetch job from database using Prisma
  const job = await prisma.job.findUnique({
    where: {
      id: params.jobId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      salaryMin: true,
      salaryMax: true,
      currency: true,
      employmentType: true,
      skillRequirements: true,
      numberOfOpenings: true,
      applicationDeadline: true,
      createdAt: true,

      company: {
        select: {
          id: true,
          name: true,
          logo: true,
        },
      },
    },
  });

  // Job not found
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

  // Return success
  return NextResponse.json(
    job,
    {
      status: 200,
    }
  );} catch (error) {
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