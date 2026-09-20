import { z } from "zod";
import { EmploymentType } from "@prisma/client";

export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, "Company name is required."),
  email: z.string().trim().email("Please enter a valid email address."),
  address: z.string().trim().min(1, "Address is required."),
  website: z.string().trim().url("Invalid website URL.").nullable().optional().or(z.literal("")),
  about: z.string().trim().nullable().optional().or(z.literal("")),
  logo: z.string().trim().url("Invalid logo URL.").nullable().optional().or(z.literal("")),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export const jobCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  description: z.string().trim().min(1, "Description is required."),
  location: z.string().trim().min(1, "Location is required."),
  salaryMin: z.number().min(0, "Minimum salary must be non-negative."),
  salaryMax: z.number().min(0, "Maximum salary must be non-negative."),
  currency: z.string().default("INR"),
  employmentType: z.nativeEnum(EmploymentType, {
    message: "Invalid employment type.",
  }),
  skillRequirements: z.string().trim().min(1, "Skill Requirements are required."),
  numberOfOpenings: z.number().int().positive("Number of openings must be greater than 0."),
  applicationDeadline: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid application deadline."),
}).refine((data) => data.salaryMax >= data.salaryMin, {
  message: "Maximum salary must be greater than or equal to minimum salary.",
  path: ["salaryMax"],
});

export const applyJobSchema = z.object({
  resumeId: z.string().optional(),
  coverLetter: z.string().optional(),
});

export const resumeCreateSchema = z.object({
  title: z.string().trim().min(1, "Title must be a non-empty string."),
});

export const resumeUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title must be a non-empty string.").optional(),
  summary: z.string().optional(),
  resumeUrl: z.string().url("Invalid resume URL.").optional().or(z.literal("")),
  githubUrl: z.string().url("Invalid GitHub URL.").optional().or(z.literal("")),
  linkedinUrl: z.string().url("Invalid LinkedIn URL.").optional().or(z.literal("")),
});
