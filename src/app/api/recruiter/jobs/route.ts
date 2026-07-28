import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role, EmploymentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
 
export async function POST(request: Request) {
  try{
  // Authentication (auth())
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
  if (session.user.role !== Role.RECRUITER){
    return NextResponse.json(
      {
        message: "Only recruiters can create jobs.",
      },
      {
        status: 403,
      }
    );
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if(!user){
    return NextResponse.json(
      {
        message: "Authentication required. Please log in again.",
      },
      {
        status: 401,
      }
    );
  }

  // Verify recruiter belongs to a company
  if (!user.companyId){
    return NextResponse.json(
      {
        message: "Recruiter must belong to a company before creating jobs.",
      },
      {
        status: 403,
      }
    );
  }

  const body = await request.json();

  const {
    title,
    description,
    location,
    salaryMin,
    salaryMax,
    currency,
    employmentType,
    skillRequirements,
    numberOfOpenings,
    applicationDeadline,
  } = body;

  // Required field validation
  if (
    !title ||
    !description ||
    !location ||
    salaryMin == null ||
    salaryMax == null ||
    !currency ||
    !employmentType ||
    !skillRequirements ||
    numberOfOpenings == null ||
    !applicationDeadline
  ) {
    return NextResponse.json(
      {
        message: "All required fields are mandatory.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof title !== "string" ||
    title.trim().length === 0
  ) {
    return NextResponse.json(
      {
        message: "Title must be string.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof description !== "string" ||
    description.trim().length === 0
  ) {
    return NextResponse.json(
      {
        message: "Description must be string.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof location !== "string" ||
    location.trim().length === 0
  ) {
    return NextResponse.json(
      {
        message: "Location must be string.",
      },
      {
        status: 400,
      }
    );
  }

  if (typeof salaryMin !== "number" || salaryMin < 0) {
    return NextResponse.json(
      {
        message: "Minimum salary must be a non-negative number.",
      },
      {
        status: 400,
      }
    );
  }

  if (typeof salaryMax !== "number" || salaryMax < 0) {
    return NextResponse.json(
      {
        message: "Maximum salary must be a non-negative number.",
      },
      {
        status: 400,
      }
    );
  }

  if (salaryMax < salaryMin){
    return NextResponse.json(
      {
        message: "Maximum salary must be greater than or equal to minimum salary.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    typeof skillRequirements !== "string" ||
    skillRequirements.trim().length === 0
  ) {
    return NextResponse.json(
      {
        message: "Skill Requirements must be string.",
      },
      {
        status: 400,
      }
    );
  }

  if (typeof numberOfOpenings !== "number" || numberOfOpenings <= 0) {
    return NextResponse.json(
      {
        message: "Number of openings must be greater than 0.",
      },
      {
        status: 400,
      }
    );
  }

  const deadline = new Date(applicationDeadline);

  if (Number.isNaN(deadline.getTime())) {
    return NextResponse.json(
      {
        message: "Invalid application deadline.",
      },
      {
        status: 400,
      }
    );
  }

  const today = new Date();

  if (deadline <= today) {
    return NextResponse.json(
      {
        message: "Application deadline must be a future date.",
      },
      {
        status: 400,
      }
    );
  }

  if (!Object.values(EmploymentType).includes(employmentType)) {
    return NextResponse.json(
      {
        message: "Invalid employment type.",
      },
      {
        status: 400,
      }
    );
  }

  const cleanTitle = title.trim();
  const cleanDescription = description.trim();
  const cleanLocation = location.trim();
  const cleanSkillRequirements = skillRequirements.trim();

  const job = await prisma.job.create({
    data: {
      title: cleanTitle,
      description: cleanDescription,
      location: cleanLocation,
      salaryMin,
      salaryMax,
      currency,
      employmentType,
      skillRequirements: cleanSkillRequirements,
      numberOfOpenings,
      applicationDeadline,
      companyId: user.companyId,
      createdById: session.user.id,
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
    },
  });

  // Success Response
  return NextResponse.json(
    {
      message: "Job created successfully.",
      job,
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


export async function GET(request: Request) {
  try{
  // Authentication (auth())
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

  const [totalJobs, jobs] = await Promise.all([
    prisma.job.count(),
    prisma.job.findMany({
      skip,
      take: limit,
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
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  const totalPages = Math.ceil(totalJobs / limit);

  return NextResponse.json(
    {
      jobs,
      pagination: {
        page,
        limit,
        totalJobs,
        totalPages: 1,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
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