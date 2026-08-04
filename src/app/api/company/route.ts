// Create a new company
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma, Role } from "@prisma/client";

export async function POST(request: Request) {
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
    if (session.user.role !== Role.RECRUITER) {
      return NextResponse.json(
        {
          message: "Only recruiters can create companies.",
        },
        {
          status: 403,
        }
      );
    }

    // Check if recruiter already belongs to a company
    const recruiter = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        companyId: true,
      },
    });

    if (recruiter?.companyId) {
      return NextResponse.json(
        {
          message: "Recruiter already belongs to a company.",
        },
        {
          status: 409,
        }
      );
    }

    const body = await request.json();

    const { 
      name,
      email,
      website,
      address,
      about,
      logo, 
    } = body;

    // Validate required fields
    const requiredFields = [
      { value: name, name: "Company name" },
      { value: email, name: "Email" },
      { value: address, name: "Address" },
    ];

    for (const field of requiredFields) {
      if (
        typeof field.value !== "string" ||
        field.value.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: `${field.name} is required.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Company name must be a non-empty string.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedName = name.trim();

    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Company email must be a non-empty string.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        {
          message: "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    if (typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json(
        {
          message: "Company address must be a non-empty string.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedAddress = address.trim();

    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    const normalizedWebsite =
      typeof website === "string" &&
      website.trim().length > 0
        ? website.trim()
        : null;

    if (
      normalizedWebsite &&
      !isValidUrl(normalizedWebsite)
    ) {
      return NextResponse.json(
        {
          message: "Invalid website URL.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedLogo =
      typeof logo === "string" &&
      logo.trim().length > 0
        ? logo.trim()
        : null;

    if (
      normalizedLogo &&
      !isValidUrl(normalizedLogo)
    ) {
      return NextResponse.json(
        {
          message: "Invalid logo URL.",
        },
        {
          status: 400,
        }
      );
    }

    const normalizedAbout =
      typeof about === "string" &&
      about.trim().length > 0
        ? about.trim()
        : null;

    if (normalizedAbout) {
      return NextResponse.json(
        {
          message: "About must be a string and describe about the company.",
        },
        {
          status: 400,
        }
      );
    }

    // Check for duplicate company
    const existingCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { name: normalizedName },
          { email: normalizedEmail },
        ],
      },
    });

    if (existingCompany?.name === normalizedName) {
      return NextResponse.json(
        {
          message: "Company name already exists.",
        },
        {
          status: 409,
        }
      );
    }

    if (existingCompany?.email === normalizedEmail) {
      return NextResponse.json(
        {
          message: "Company email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    // Create the company.
    // Update the recruite.
    const company = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          website: normalizedWebsite,
          address: normalizedAddress,
          about: normalizedAbout,
          logo: normalizedLogo,
        },
        select: {
          id: true,
          name: true,
          email: true,
          website: true,
          address: true,
          about: true,
          logo: true,
          createdAt: true,
        },
      });

      await tx.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          companyId: company.id,
        },
      });

      return company;
    });

    //Success Response
    return NextResponse.json(
      {
        message: "Company created successfully.",
        company,
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

// GET request to fetch company of logged-in recruiter
export async function GET(request: Request) {
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
    if (session.user.role !== Role.RECRUITER) {
      return NextResponse.json(
        {
          message: "Only recruiters can view their company.",
        },
        {
          status: 403,
        }
      );
    }

    // Fetch the recruiter to ensure they exist
    const recruiter = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        companyId: true,
      },
    });

    if (!recruiter?.companyId) {
      return NextResponse.json(
        {
          message: "Recruiter is not associated with any company.",
        },
        {
          status: 404,
        }
      );
    }

    // Fetch the company of the logged-in recruiter
    const company = await prisma.company.findUnique({
      where: {
        id: recruiter.companyId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        website: true,
        address: true,
        about: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
        recruiters: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        {
          message: "Company not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        company,
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

// PATCH request to update company of logged-in recruiter
export async function PATCH(request: Request) {
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
    if (session.user.role !== Role.RECRUITER) {
      return NextResponse.json(
        {
          message: "Only recruiters can update their company.",
        },
        {
          status: 403,
        }
      );
    }

    // Fetch the recruiter to ensure they exist
    const recruiter = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        companyId: true,
      },
    });

    if (!recruiter?.companyId) {
      return NextResponse.json(
        {
          message: "Recruiter is not associated with any company.",
        },
        {
          status: 404,
        }
      );
    }

    const body = await request.json();

    const {
      name,
      email,
      website,
      address,
      about,
      logo,
    } = body;

    const data: Prisma.CompanyUpdateInput = {};

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          {
            message: "Name must be string.",
          },
          {
            status: 400,
          }
        );
      }

      const effectiveName = name.trim();

      // Duplicate name validation
      const existingCompany = await prisma.company.findFirst({
        where: {
          name: effectiveName,
          NOT: {
            id: recruiter.companyId,
          },
        }
      });

      if (existingCompany) {
        return NextResponse.json(
          {
            message: "Company name already exists.",
          },
          {
            status: 409,
          }
        );
      }

      data.name = effectiveName;
    }

    // Update email
    if (email !== undefined) {
      if (typeof email !== "string" || email.trim().length === 0) {
        return NextResponse.json(
          {
            message: "Email must be a non-empty string.",
          },
          {
            status: 400,
          }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
        return NextResponse.json(
          {
            message: "Please enter a valid email address.",
          },
          {
            status: 400,
          }
        );
      }

      const existingCompany = await prisma.company.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id: recruiter.companyId,
          },
        },
      });

      if (existingCompany) {
        return NextResponse.json(
          {
            message: "Company email already exists.",
          },
          {
            status: 409,
          }
        );
      }

      data.email = normalizedEmail;
    }

    // Optional fields
    function isValidUrl(value: string) {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }

    if (website !== undefined) {
      if (typeof website !== "string") {
        return NextResponse.json(
          {
            message: "Website URL must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        website.trim().length > 0 &&
        !isValidUrl(website.trim())
      ) {
        return NextResponse.json(
          { 
            message: "Invalid Website URL." 
          },
          { 
            status: 400 
          }
        );
      }

      data.website = 
        website.trim().length > 0
        ? website.trim()
        : null;
    }

    if (logo !== undefined) {
      if (typeof logo !== "string") {
        return NextResponse.json(
          {
            message: "Logo URL must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        logo.trim().length > 0 &&
        !isValidUrl(logo.trim())
      ) {
        return NextResponse.json(
          { 
            message: "Invalid Logo URL." 
          },
          { 
            status: 400 
          }
        );
      }

      data.logo = 
        logo.trim().length > 0
        ? logo.trim()
        : null;
    }

    if (address !== undefined) {
      if (
        typeof address !== "string" ||
        address.trim().length === 0
      ) {
        return NextResponse.json(
          {
            message: "Address must be a non-empty string.",
          },
          {
            status: 400,
          }
        );
      }

      data.address = address.trim();
    }
    
    if (about !== undefined) {
      if (typeof about !== "string") {
        return NextResponse.json(
          {
            message: "About must be a string.",
          },
          {
            status: 400,
          }
        );
      }

      data.about =
        about.trim().length > 0
          ? about.trim()
          : null;
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

    const updatedCompany = await prisma.company.update({
      where: {
        id: recruiter.companyId,
      },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        website: true,
        address: true,
        about: true,
        logo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "Company updated successfully.",
        company: updatedCompany,
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

// DELETE request to delete company of logged-in recruiter
export async function DELETE(request: Request) {
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
    if (session.user.role !== Role.RECRUITER) {
      return NextResponse.json(
        {
          message: "Only recruiters can delete their company.",
        },
        {
          status: 403,
        }
      );
    }

    // Fetch the recruiter to ensure they exist
    const recruiter = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        companyId: true,
      },
    });

    if (!recruiter?.companyId) {
      return NextResponse.json(
        {
          message: "Recruiter is not associated with any company.",
        },
        {
          status: 404,
        }
      );
    }

    const companyId = recruiter.companyId;

    // Fetch the company
    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
      select: {
        id: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        {
          message: "Company not found.",
        },
        {
          status: 404,
        }
      );
    }

    // Check for active jobs
    const job = await prisma.job.findFirst({
      where: {
        companyId: companyId,
      },
    });

    if (job) {
      return NextResponse.json(
        {
          message: "This company cannot be deleted because it has associated jobs.",
        },
        {
          status: 409,
        }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          companyId: null,
        },
      });

      await tx.company.delete({
        where: {
          id: companyId,
        },
      });
    });

    return NextResponse.json(
      {
        message: "Company deleted successfully.",
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