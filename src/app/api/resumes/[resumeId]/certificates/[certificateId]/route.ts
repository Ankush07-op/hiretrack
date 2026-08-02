// Update Certificate
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { resumeId: string, certificateId: string } }
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
          message: "Only candidates can update certificates.",
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

    const resumeCertificate =
      await prisma.resumeCertificate.findFirst({
        where: {
          resumeId: params.resumeId,
          certificateId: params.certificateId,
        },
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
      });

    if (!resumeCertificate) {
      return NextResponse.json(
        {
          message: "Certificate not found.",
        },
        {
          status: 404,
        }
      );
    }

    const certificate = resumeCertificate.certificate;

    if (!certificate) {
      return NextResponse.json(
        {
          message: "Certificate not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Read the body
    const body = await request.json();

    const {
      title,
      issuer,
      credentialUrl,
      issueDate,
      expiryDate,
      credentialId,
    } = body;

    // Partial Validation
    const data: Prisma.CertificateUpdateInput = {};

    if (title !== undefined) {

      if (
        typeof title !== "string" ||
        title.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Title is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.title = title.trim();
    }

    if (issuer !== undefined) {

      if (
        typeof issuer !== "string" ||
        issuer.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Issuer is required.",
          },
          {
            status: 400,
          }
        );
      }

      data.issuer = issuer.trim();
    }

    if (credentialId !== undefined) {
      if (typeof credentialId !== "string") {
        return NextResponse.json(
          {
            message: "Credential ID must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      data.credentialId =
        credentialId.trim().length > 0
          ? credentialId.trim()
          : null;
    }

    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    if (credentialUrl !== undefined) {
      if (typeof credentialUrl !== "string") {
        return NextResponse.json(
          {
            message: "Credential URL must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        credentialUrl.trim().length > 0 &&
        !isValidUrl(credentialUrl.trim())
      ) {
        return NextResponse.json(
          { 
            message: "Invalid Credential URL." 
          },
          { 
            status: 400 
          }
        );
      }

      data.credentialUrl =
        credentialUrl.trim().length > 0
          ? credentialUrl.trim()
          : null;
    }

    const parsedIssueDate =
      issueDate
        ? new Date(issueDate)
        : undefined;

    // Validate Dates
    if (
      parsedIssueDate &&
      Number.isNaN(parsedIssueDate.getTime())
    ) {
      return NextResponse.json(
        {
          message: "Invalid issue date.",
        },
        {
          status: 400,
        }
      );
    }

    if (parsedIssueDate) {
      data.issueDate = parsedIssueDate;
    }
    
    const parsedExpiryDate =
      expiryDate
        ? new Date(expiryDate)
        : undefined;

    // Validate Expiry Date
    if (
      parsedExpiryDate &&
      Number.isNaN(parsedExpiryDate.getTime())
    ) {
      return NextResponse.json(
        {
          message: "Invalid expiry date.",
        },
        {
          status: 400,
        }
      );
    }

    if (parsedExpiryDate) {
      data.expiryDate = parsedExpiryDate;
    }

    const effectiveTitle =
      title?.trim() ??
      certificate.title;

    const effectiveIssuer =
      issuer?.trim() ??
      certificate.issuer;

    const effectiveCredentialId =
      credentialId?.trim() ??
      certificate.credentialId;

    // Duplicate Certificate Check
    let existingCertificate;

    if (
      typeof credentialId === "string" &&
      credentialId.trim().length > 0
    ) {
    existingCertificate = await prisma.certificate.findFirst({
      where: {
        candidateId: session.user.id,
        credentialId: effectiveCredentialId,
        NOT: {
          id: params.certificateId,
        }
      },
    });
    } else {
      existingCertificate = await prisma.certificate.findFirst({
        where: {
          candidateId: session.user.id,
          title: effectiveTitle,
          issuer: effectiveIssuer,
          NOT: {
            id: params.certificateId,
          }
        },
      });
    }

    if (existingCertificate) {
      return NextResponse.json(
        {
          message: "Certificate already exists.",
        },
        {
          status: 409,
        }
      );
    }

    const effectiveIssueDate =
      parsedIssueDate ??
      certificate.issueDate;

    const effectiveExpiryDate =
      parsedExpiryDate ??
      certificate.expiryDate;

    if (
      effectiveIssueDate &&
      effectiveExpiryDate &&
      effectiveExpiryDate < effectiveIssueDate
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

    const updatedCertificate = await prisma.certificate.update({
      where: {
        id: params.certificateId,
      },
      data,
      select: {
        id: true,
        title: true,
        issuer: true,
        issueDate: true,
        expiryDate: true,
        credentialId: true,
        credentialUrl: true,
      },
    });

    // Success Response
    return NextResponse.json(
      {
        message: "Certificate updated successfully.",
        certificate: updatedCertificate,
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

// Delete Certificate
export async function DELETE(
  _request: Request,
  { params }: { params: {
      resumeId: string;
      certificateId: string;
    };
  }
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
          message: "Only candidates can delete certificates.",
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

    // Verify relation exists
    const resumeCertificate =
      await prisma.resumeCertificate.findFirst({
        where: {
          resumeId: params.resumeId,
          certificateId: params.certificateId,
        },
        select: {
          resumeId: true,
          certificateId: true,
        },
      });

    if (!resumeCertificate) {
      return NextResponse.json(
        {
          message: "Certificate not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Delete the relation
    await prisma.resumeCertificate.delete({
      where: {
        resumeId_certificateId: {
          resumeId: params.resumeId,
          certificateId: params.certificateId,
        },
      },
    });

    // Check remaining links
    const remainingLinks = await prisma.resumeCertificate.count({
      where: {
        certificateId: params.certificateId,
      },
    });

    // Delete the certificate only if unused
    if (remainingLinks === 0) {
      await prisma.certificate.delete({
        where: {
          id: params.certificateId,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Certificate deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
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