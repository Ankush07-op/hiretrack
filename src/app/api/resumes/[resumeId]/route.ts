// Update a resume
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function PATCH(
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
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates can update resumes.",
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
        candidateId: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        {
          message: "Resume doesn't exists.",
        },
        {
          status: 404,
        }
      );
    }

    const body = await request.json();

    const {
      title,
      summary,
      resumeUrl,
      githubUrl,
      linkedinUrl,
    } = body;

    const data: Prisma.ResumeUpdateInput = {};

    // Update title
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          {
            message: "Title must be string.",
          },
          {
            status: 400,
          }
        );
      }

      const normalizedTitle = title.trim();

      // Duplicate title validation
      const existingResume = await prisma.resume.findFirst({
        where: {
          candidateId: session.user.id,
          title: normalizedTitle,
          NOT: {
            id: params.resumeId,
          },
        }
      });

      if (existingResume) {
        return NextResponse.json(
          {
            message: "Resume title already exists.",
          },
          {
            status: 409,
          }
        );
      }

      data.title = normalizedTitle;
    }

    // Optional fields
    if (summary !== undefined) {
      data.summary = summary;
    }

    if (githubUrl !== undefined) {
      data.githubUrl = githubUrl;
    }

    if (linkedinUrl !== undefined) {
      data.linkedinUrl = linkedinUrl;
    }

    if (resumeUrl !== undefined) {
      data.resumeUrl = resumeUrl;
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

    const updatedResume = await prisma.resume.update({
      where: {
        id: params.resumeId,
      },
      data,
      select: {
        id: true,
        title: true,
        summary: true,
        resumeUrl: true,
        githubUrl: true,
        linkedinUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Resume updated successfully.",
        resume: updatedResume,
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

// View the entire resume
export async function GET(
  request:Request,
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
    if (
      session.user.role !== Role.CANDIDATE &&
      session.user.role !== Role.RECRUITER
    ) {
      return NextResponse.json(
        {
          message: "You are not authorized to view resumes.",
        },
        {
          status: 403,
        }
      );
    }

    // Candidate ownership
    const whereClause: Prisma.ResumeWhereInput =
      session.user.role === Role.CANDIDATE
        ? {
            id: params.resumeId,
            candidateId: session.user.id,
          }
        : {
            id: params.resumeId,
          };

    // Fetch the complete resume
    const resume = await prisma.resume.findFirst({
      where: whereClause,
      select: {
        id: true,
        title: true,
        summary: true,
        githubUrl: true,
        linkedinUrl: true,
        resumeUrl: true,

        experiences: {
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            companyName: true,
            jobTitle: true,
            location: true,
            description: true,
            startDate: true,
            endDate: true,
            currentlyWorking: true,
          },
        },

        educations: {
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            degree: true,
            fieldOfStudy: true,
            instituteName: true,
            grade: true,
            startDate: true,
            endDate: true,
            currentlyStudying: true,
          },
        },

        projects: {
          orderBy: {
            startDate: "desc",
          },
          select: {
            id: true,
            title: true,
            description: true,
            githubUrl: true,
            liveUrl: true,
            techStack: true,
            startDate: true,
            endDate: true,
          },
        },

        resumeCertificates: {
          select: {
            certificate: {
              select: {
                id: true,
                title: true,
                issuer: true,
                issueDate: true,
                expiryDate: true,
                credentialId: true,
                credentialUrl: true,
              },
            },
          },
        },
      },
    });

    // Resume not found
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

    // Create the response object
    const {
      resumeCertificates,
      ...resumeData
    } = resume;

    const response = {
      ...resumeData,
      certificates: resume.resumeCertificates.map(
        (item) => item.certificate
      ),
    };

    // Success response
    return NextResponse.json(
      {
        resume: response,
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

// Delete a resume
export async function DELETE(
  _request: Request,
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
    if (session.user.role !== Role.CANDIDATE) {
      return NextResponse.json(
        {
          message: "Only candidates candelete resumes.",
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

    // Fetch all linked certificates
    const resumeCertificates =
      await prisma.resumeCertificate.findMany({
        where: {
          resumeId: params.resumeId,
        },
        select: {
          certificateId: true,
        },
      });

    // Delete all ResumeCertificate relations
    await prisma.resumeCertificate.deleteMany({
      where: {
        resumeId: params.resumeId,
      },
    });

    // Delete orphan certificates
    for (const item of resumeCertificates) {
      const remainingLinks =
      await prisma.resumeCertificate.count({
        where: {
          certificateId: item.certificateId,
        },
      });

      if (remainingLinks === 0) {
        await prisma.certificate.delete({
          where: {
            id: item.certificateId,
          },
        });
      }
    }

    // Delete Experiences
    await prisma.experience.deleteMany({
      where: {
        resumeId: params.resumeId,
      },
    });

    // Delete Educations
    await prisma.education.deleteMany({
      where: {
        resumeId: params.resumeId,
      },
    });

    // Delete Projects
    await prisma.project.deleteMany({
      where: {
        resumeId: params.resumeId,
      },
    });

    // Delete Resume
    await prisma.resume.delete({
      where: {
        id: params.resumeId,
      },
    });

    return NextResponse.json(
      {
        message: "Resume deleted successfully.",
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