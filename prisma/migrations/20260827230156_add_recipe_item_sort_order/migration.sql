-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "RecipeItem" ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;
