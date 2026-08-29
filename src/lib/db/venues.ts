import { prisma } from "@/lib/prisma";
import type { Venue, MenuCategory, MenuItem } from "@/lib/data/venues";

// DB-backed replacement for src/lib/data/venues.ts, once the admin panel
// is the source of truth for menu content instead of the hardcoded file.
// Shape matches the old file exactly so MenuView and the guest pages
// don't need to change at all.

export async function getVenueFromDb(slug: string): Promise<Venue | null> {
  const venue = await prisma.venue.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            include: {
              recipeItems: { orderBy: { sortOrder: "asc" }, include: { ingredient: true } },
              modifierGroups: {
                orderBy: { sortOrder: "asc" },
                include: { options: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!venue) return null;

  return {
    slug: venue.slug,
    brandColor: venue.brandColor,
    name: { ka: venue.nameKa, ru: venue.nameRu, en: venue.nameEn },
    address: { ka: venue.addressKa, ru: venue.addressRu, en: venue.addressEn },
    urlGoogleReview: venue.urlGoogleReview,
    categories: venue.categories.map(
      (c): MenuCategory => ({
        slug: c.slug,
        name: { ka: c.nameKa, ru: c.nameRu, en: c.nameEn },
        items: c.items.map(
          (i): MenuItem => ({
            slug: i.slug,
            priceGel: Number(i.priceGel),
            discountMenuPercent: i.discountMenuPercent != null ? Number(i.discountMenuPercent) : null,
            name: { ka: i.nameKa, ru: i.nameRu, en: i.nameEn },
            description: {
              ka: i.descriptionKa,
              ru: i.descriptionRu,
              en: i.descriptionEn,
            },
            // Блюдо доступно, только если его не отключили вручную И
            // все ингредиенты его состава в наличии (если состав указан).
            available: i.available && i.recipeItems.every((ri) => ri.ingredient.available),
            photoUrl: i.photoUrl ?? undefined,
            modifierGroups: i.modifierGroups.map((g) => ({
              id: g.id,
              name: { ka: g.nameKa, ru: g.nameRu, en: g.nameEn },
              selectionType: g.selectionType === "MULTIPLE" ? "MULTIPLE" : "SINGLE",
              maxSelect: g.maxSelect,
              options: g.options.map((o) => ({
                id: o.id,
                name: { ka: o.nameKa, ru: o.nameRu, en: o.nameEn },
                priceGel: Number(o.priceGel),
              })),
            })),
          })
        ),
      })
    ),
  };
}

export async function listVenuesFromDb(): Promise<
  { slug: string; name: Venue["name"]; address: Venue["address"]; brandColor: string }[]
> {
  const venues = await prisma.venue.findMany({ orderBy: { slug: "asc" } });
  return venues.map((v) => ({
    slug: v.slug,
    brandColor: v.brandColor,
    name: { ka: v.nameKa, ru: v.nameRu, en: v.nameEn },
    address: { ka: v.addressKa, ru: v.addressRu, en: v.addressEn },
  }));
}
