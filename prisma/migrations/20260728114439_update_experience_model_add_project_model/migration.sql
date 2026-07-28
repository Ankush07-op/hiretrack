/*
  Warnings:

  - You are about to drop the column `projects` on the `Experience` table. All the data in the column will be lost.
  - The `description` column on the `Experience` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[resumeId,companyName,jobTitle,startDate]` on the table `Experience` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `location` to the `Experience` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Experience" DROP COLUMN "projects",
ADD COLUMN     "location" TEXT NOT NULL,
DROP COLUMN "description",
ADD COLUMN     "description" JSONB;

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "githubUrl" TEXT,
    "liveUrl" TEXT,
    "techStack" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "resumeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Experience_resumeId_companyName_jobTitle_startDate_key" ON "Experience"("resumeId", "companyName", "jobTitle", "startDate");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
