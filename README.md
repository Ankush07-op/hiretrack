# 🎯 Hiretrack — Full-Stack Recruitment & Candidate Tracking Platform

**Hiretrack** is a modern, full-stack recruitment management platform designed to streamline hiring workflows for recruiters, job seekers (candidates), and enterprise administrators. It features structured digital resume building, multi-criteria job search, real-time application pipeline tracking, and role-based access security.

---

## ✨ Features

- 🔐 **Role-Based Access Control (RBAC):** Authenticated session management (`ADMIN`, `RECRUITER`, `CANDIDATE`) using NextAuth.js v5 (JWT strategy) and `bcrypt` password hashing.
- 📄 **Digital Resume & Portfolio Builder:** Structured candidate profiles supporting work experiences, educations, portfolio projects, and professional certifications with relational database cascades.
- 🔍 **Advanced Job Search & Filtering:** Case-insensitive search across job titles, company names, and descriptions, combined with location filters, employment type options (`FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACT`), and server-side pagination.
- 📊 **Recruitment Pipeline Management:** End-to-end application lifecycle status updates (`APPLIED` → `UNDER_REVIEW` → `SHORTLISTED` → `INTERVIEW` → `OFFERED` / `REJECTED` / `HIRED`).
- 📅 **Interview Scheduling:** Integrated interview round management with meeting links, mode selection, evaluator feedback, and result tracking.
- 🏢 **Company & Recruiter Bindings:** Corporate profile management enabling recruiters to post, update, and manage job listings under their company workspace.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Server-side API Route Handlers)
- **Frontend UI:** [React 19](https://react.dev/), TypeScript, [Tailwind CSS v4](https://tailwindcss.com/)
- **Database Layer:** [PostgreSQL](https://www.postgresql.org/)
- **ORM:** [Prisma ORM v6](https://www.prisma.io/)
- **Authentication:** [NextAuth.js v5](https://authjs.dev/) with Credentials Provider & JWT Strategy
- **Validation & Hashing:** [Zod](https://zod.dev/) & [Bcrypt](https://www.npmjs.com/package/bcrypt)

---

## 📁 Project Directory Structure

```text
hiretrack/
├── prisma/
│   └── schema.prisma         # Database models, relations & indexes
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/         # NextAuth endpoint
│   │   │   ├── candidate/    # Candidate application tracking endpoints
│   │   │   ├── company/      # Recruiter company management endpoints
│   │   │   ├── jobs/         # Public job listings & apply route
│   │   │   ├── recruiter/    # Recruiter job posting & pipeline management
│   │   │   ├── register/     # User registration endpoint
│   │   │   └── resumes/      # Resume CRUD & nested sub-resources
│   │   ├── dashboard/        # Authenticated dashboard page
│   │   ├── login/            # User login page
│   │   └── register/         # Account registration page
│   ├── auth.ts               # NextAuth configuration & callbacks
│   ├── lib/
│   │   ├── prisma.ts         # Singleton Prisma client instance
│   │   └── validators.ts     # Zod request validation schemas
│   └── types/                # Extended TypeScript definitions
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20.x or higher
- **PostgreSQL** database (Local instance or hosted on Supabase / Neon / Render)
- **npm** or **pnpm** package manager

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ankush07-op/hiretrack.git
   cd hiretrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/hiretrack?schema=public"
   AUTH_SECRET="your-random-super-secret-key"
   ```

4. **Synchronize Database Schema:**
   Generate Prisma Client and push database schema tables & indexes:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 Key API Endpoints Overview

| Method | Endpoint | Role Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/register` | Public | Register a new Candidate or Recruiter account |
| `GET` | `/api/jobs` | Public | Search & list open jobs with filtering and pagination |
| `GET` | `/api/jobs/[id]` | Public | Fetch detailed job view |
| `POST` | `/api/jobs/[id]/apply` | Candidate | Submit application attached with selected resume |
| `GET` | `/api/candidate/applications` | Candidate | View candidate's job applications and live status |
| `POST` | `/api/company` | Recruiter | Create company profile & link recruiter account |
| `GET / POST` | `/api/recruiter/jobs` | Recruiter | List recruiter's posted jobs or post a new job |
| `GET` | `/api/recruiter/jobs/[jobId]/applications` | Recruiter | View all candidate applications for a specific job |
| `PATCH` | `/api/recruiter/jobs/[jobId]/applications/[applicationId]` | Recruiter | Update candidate application status |
| `GET / POST` | `/api/resumes` | Candidate | Manage candidate master resumes |
| `GET / PATCH / DELETE` | `/api/resumes/[resumeId]` | Candidate / Recruiter | View, update, or delete resume (Guarded privacy access) |

---

## 📜 License

This project is open-source and built for educational and final year project submission purposes.
