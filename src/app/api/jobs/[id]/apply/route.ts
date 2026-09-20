import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { Role, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
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

    // Authorization (Candidate role check)
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates can apply for jobs.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { resumeId: requestedResumeId, coverLetter } = body;

    const [user, job, existingApplication] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        include: {
          resumes: {
            orderBy: {
              updatedAt: "desc",
            },
          },
        },
      }),

      prisma.job.findUnique({
        where: {
          id: params.id,
        },
      }),

      prisma.application.findFirst({
        where: {
          candidateId: session.user.id,
          jobId: params.id,
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

    // Job Status check
    if (job.status !== JobStatus.OPEN) {
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
          message: "You must create a resume before applying.",
        },
        {
          status: 400,
        }
      );
    }

    // Select specific resume or fallback to latest updated resume
    let targetResumeId = user.resumes[0].id;

    if (requestedResumeId) {
      const matchedResume = user.resumes.find(
        (r) => r.id === requestedResumeId
      );
      if (!matchedResume) {
        return NextResponse.json(
          {
            message: "Selected resume not found or does not belong to you.",
          },
          {
            status: 400,
          }
        );
      }
      targetResumeId = matchedResume.id;
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
        jobId: params.id,
        resumeId: targetResumeId,
        coverLetter: coverLetter || null,
      },
      select: {
        id: true,
        candidateId: true,
        jobId: true,
        resumeId: true,
        status: true,
        appliedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Applied successfully.",
        application: newApplication,
      },
      {
        status: 201,
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
