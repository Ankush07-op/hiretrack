// Create Certificate Entry
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
          message: "Only candidates can add certificates.",
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

    const body = await request.json();

    const {
      title,
      issuer,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    } = body

    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Title is required.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedTitle = title.trim();

    if (typeof issuer !== "string" || issuer.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Issuer is required.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedIssuer = issuer.trim();

    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    const normalizedCredentialUrl =
      typeof credentialUrl === "string" &&
      credentialUrl.trim().length > 0
        ? credentialUrl.trim()
        : null;

    if (normalizedCredentialUrl && !isValidUrl(normalizedCredentialUrl)
    ) {
      return NextResponse.json(
        { message: "Invalid Credential URL." },
        { status: 400 }
      );
    }

    const parsedIssueDate =
      issueDate
        ? new Date(issueDate)
        : null;

    if (parsedIssueDate) {
      if (Number.isNaN(parsedIssueDate.getTime())) {
        return NextResponse.json(
          {
            message: "Invalid issue date.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const parsedExpiryDate =
      expiryDate
        ? new Date(expiryDate)
        : null;

    if (Number.isNaN(parsedExpiryDate?.getTime())) {
      return NextResponse.json(
        {
          message: "Invalid expiry date.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      parsedIssueDate &&
      parsedExpiryDate &&
      parsedExpiryDate < parsedIssueDate
    ) {
      return NextResponse.json(
        {
          message: "Expiry date cannot be before issue date.",
        },
        {
          status: 400,
        }
      );
    }    

    let existingCertificate;

    if (
      typeof credentialId === "string" &&
      credentialId.trim().length > 0
    ) {
      existingCertificate = await prisma.certificate.findFirst({
        where: {
          candidateId: session.user.id,
          credentialId: credentialId.trim(),
        },
      });
    } else {
      existingCertificate = await prisma.certificate.findFirst({
        where: {
          candidateId: session.user.id,
          title: normalizedTitle,
          issuer: normalizedIssuer,
        },
      });
    }

    let certificate;

    if (!existingCertificate) {
      certificate = await prisma.certificate.create({
        data: {
          title: normalizedTitle,
          issuer: normalizedIssuer,
          issueDate: parsedIssueDate,
          expiryDate: parsedExpiryDate,
          credentialId:
            typeof credentialId === "string" &&
            credentialId.trim().length > 0
              ? credentialId.trim()
              : null,
          credentialUrl: normalizedCredentialUrl,
          candidateId: session.user.id,
        },
        select: {
          id: true,
          title: true,
          issuer: true,
          credentialId: true,
          credentialUrl: true
        },
      });
    } else {
      certificate = existingCertificate;
    }

    const existingResumeCertificate = await prisma.resumeCertificate.findUnique({
      where: {
        resumeId_certificateId: {
          resumeId: params.resumeId,
          certificateId: certificate.id,
        },
      },
    });

    if (existingResumeCertificate) {
      return NextResponse.json(
        {
          message:
            "Certificate already added to this resume.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.resumeCertificate.create({
      data: {
        resumeId: params.resumeId,
        certificateId: certificate.id,
      },
    });

    return NextResponse.json(
      {
        message: "Certificate added successfully.",
        certificate,
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