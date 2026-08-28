// Loads the current src/lib/data/venues.ts hardcoded menu into Postgres.
// Safe to re-run: it upserts venues and fully replaces their categories/
// items each time, so this is also how you'd bulk re-import a venue's
// content later on (e.g. after re-scraping Wolt).
//
// Run with: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { venues } from "../src/lib/data/venues";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-vm" },
    update: {},
    create: { id: "tenant-vm", name: "VM" },
  });

  for (const venue of Object.values(venues)) {
    const venueRow = await prisma.venue.upsert({
      where: { slug: venue.slug },
      update: {
        nameKa: venue.name.ka,
        nameRu: venue.name.ru,
        nameEn: venue.name.en,
        addressKa: venue.address.ka,
        addressRu: venue.address.ru,
        addressEn: venue.address.en,
        brandColor: venue.brandColor,
      },
      create: {
        slug: venue.slug,
        tenantId: tenant.id,
        nameKa: venue.name.ka,
        nameRu: venue.name.ru,
        nameEn: venue.name.en,
        addressKa: venue.address.ka,
        addressRu: venue.address.ru,
        addressEn: venue.address.en,
        brandColor: venue.brandColor,
      },
    });

    // Replace this venue's categories/items wholesale from the source file.
    await prisma.menuCategory.deleteMany({ where: { venueId: venueRow.id } });

    for (const [categoryIndex, category] of venue.categories.entries()) {
      const categoryRow = await prisma.menuCategory.create({
        data: {
          venueId: venueRow.id,
          slug: category.slug,
          nameKa: category.name.ka,
          nameRu: category.name.ru,
          nameEn: category.name.en,
          sortOrder: categoryIndex,
        },
      });

      for (const [itemIndex, item] of category.items.entries()) {
        await prisma.menuItem.create({
          data: {
            categoryId: categoryRow.id,
            slug: item.slug,
            nameKa: item.name.ka,
            nameRu: item.name.ru,
            nameEn: item.name.en,
            descriptionKa: item.description.ka ?? "",
            descriptionRu: item.description.ru ?? "",
            descriptionEn: item.description.en ?? "",
            priceGel: item.priceGel,
            available: item.available,
            photoUrl: item.photoUrl ?? null,
            sortOrder: itemIndex,
          },
        });
      }
    }

    console.log(`Seeded ${venue.slug}: ${venue.categories.length} categories`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
