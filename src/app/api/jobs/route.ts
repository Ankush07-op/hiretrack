/*Search Engine:
  🔍 Search (title)
  📍 Location filter
  💼 Employment type filter
  💰 Salary range
  📄 Sorting
  📚 Pagination
*/
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, JobStatus, EmploymentType} from "@prisma/client";

export async function GET(request:Request) {
  try{
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

    const search = searchParams.get("search");
    const location = searchParams.get("location");
    const employmentType = searchParams.get("employmentType");

    const where: Prisma.JobWhereInput = {
      status: JobStatus.OPEN,
    };

    if (search) {
      where.OR = [
        {title: {contains: search, mode: 'insensitive'}},
        {description: {contains: search, mode: 'insensitive'}},
        {company: { name: {contains: search, mode: 'insensitive'}}}
      ];
    }

    if (location) {
      where.location = location;
    }

    if (employmentType) {
      where.employmentType = employmentType as EmploymentType;
    }

    const [totalJobs, jobs] = await Promise.all([
      prisma.job.count({
        where,
      }),
      
      prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          location: true,
          salaryMin: true,
          salaryMax: true,
          employmentType: true,
          createdAt: true,
          company: {
            select:{
              name: true,
              logo: true,
            }
          }
        }
      })
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