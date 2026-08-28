-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "discountBoltPercent" DECIMAL(65,30),
ADD COLUMN     "discountGlovoPercent" DECIMAL(65,30),
ADD COLUMN     "discountWoltPercent" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "urlBolt" TEXT,
ADD COLUMN     "urlGlovo" TEXT,
ADD COLUMN     "urlWolt" TEXT;
