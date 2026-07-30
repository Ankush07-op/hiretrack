/*
  Warnings:

  - A unique constraint covering the columns `[resumeId,degree,instituteName,startDate]` on the table `Education` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Education_resumeId_degree_instituteName_startDate_key" ON "Education"("resumeId", "degree", "instituteName", "startDate");
