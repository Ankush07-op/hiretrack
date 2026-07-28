import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
  // Authentication
  const session = await auth();

  if(!session){
    return NextResponse.json(
      {
        message: "Authentication required.",
      },
      {
        status: 401,
      }
    );
  }
  
  // Authorization(role verificaction)
  if (session.user.role !== Role.CANDIDATE){
    return NextResponse.json(
      {
        message: "Only candidates can apply for jobs.",
      },
      {
        status: 403,
      }
    );
  }

  const [user, job, existingApplication] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      include: {
        resumes: true,
      }
    }),
      
    prisma.job.findUnique({
      where: {
        id: params.jobId,
      },
    }),

    prisma.application.findFirst({
      where: {
        candidateId: session.user.id,
        jobId: params.jobId,
      },
    }),
  ]);

  if (!user) {
    return NextResponse.json(
      {
        message: "Authentication required. Please log in again.",
      },
      {
        status: 401,
      }
    );
  }

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

  // Job Status
  if (job.status !== JobStatus.OPEN){
    return NextResponse.json(
      {
        message: "Job application is closed.",
      },
      {
        status: 409,
      }
    );
  }

  // Deadline validation
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

  // Resume validation
  if (!user.resumes || user.resumes.length === 0) {
    return NextResponse.json(
      {
        message: "You must upload a resume.",
      },
      {
        status: 400,
      }
    );
  }

  if (existingApplication) {
    return NextResponse.json(
      {
        message: "You have already applied for this job.",
      },
      {
        status: 409,
      }
    );
  }

  const newApplication = await prisma.application.create({
    data: {
      candidateId: session.user.id,
      jobId: params.jobId,
      resumeId: user.resumes[0].id,
    }
  });

  // Return success
  return NextResponse.json(
    {
      message: "Applied successfully.",
    },
    {
      status: 201,
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