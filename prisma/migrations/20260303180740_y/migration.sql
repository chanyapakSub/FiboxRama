/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Evaluation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Evaluator` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Evaluator` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Score` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Score` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Evaluation" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Evaluator" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Score" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";
