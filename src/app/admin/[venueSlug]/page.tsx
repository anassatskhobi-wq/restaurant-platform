import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";
import { VenueEditor } from "./VenueEditor";

export default async function AdminVenuePage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const staff = await getStaffContext();
  if (!staff) redirect("/admin");

  const venue = await prisma.venue.findUnique({
    where: { slug: params.venueSlug },
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

  if (!venue) notFound();
  if (!canEditVenue(staff, venue)) redirect("/admin");
  // OPERATOR не видит цены/себестоимость/состав — только упрощённую
  // страницу вкл/выкл.
  if (staff.role === "OPERATOR") redirect(`/admin/${params.venueSlug}/operator`);

  const ingredients = await prisma.ingredient.findMany({
    where: { venueId: venue.id },
    orderBy: { name: "asc" },
  });

  const initialVenue = {
    id: venue.id,
    slug: venue.slug,
    nameKa: venue.nameKa,
    nameRu: venue.nameRu,
    nameEn: venue.nameEn,
    urlWolt: venue.urlWolt ?? "",
    urlBolt: venue.urlBolt ?? "",
    urlGlovo: venue.urlGlovo ?? "",
    urlFacebook: venue.urlFacebook ?? "",
    urlInstagram: venue.urlInstagram ?? "",
    urlMaps: venue.urlMaps ?? "",
    urlGoogleReview: venue.urlGoogleReview ?? "",
    aboutText: venue.aboutText ?? "",
    categories: venue.categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      nameKa: c.nameKa,
      nameRu: c.nameRu,
      nameEn: c.nameEn,
      items: c.items.map((i) => ({
        id: i.id,
        slug: i.slug,
        nameKa: i.nameKa,
        nameRu: i.nameRu,
        nameEn: i.nameEn,
        descriptionKa: i.descriptionKa,
        descriptionRu: i.descriptionRu,
        descriptionEn: i.descriptionEn,
        priceGel: Number(i.priceGel),
        discountMenuPercent: i.discountMenuPercent != null ? Number(i.discountMenuPercent) : null,
        discountWoltPercent: i.discountWoltPercent != null ? Number(i.discountWoltPercent) : null,
        discountBoltPercent: i.discountBoltPercent != null ? Number(i.discountBoltPercent) : null,
        discountGlovoPercent: i.discountGlovoPercent != null ? Number(i.discountGlovoPercent) : null,
        available: i.available,
        photoUrl: i.photoUrl ?? "",
        recipeItems: i.recipeItems.map((ri) => ({
          id: ri.id,
          ingredientId: ri.ingredientId,
          quantity: Number(ri.quantity),
          ingredient: {
            id: ri.ingredient.id,
            name: ri.ingredient.name,
            nameKa: ri.ingredient.nameKa ?? "",
            nameRu: ri.ingredient.nameRu ?? "",
            nameEn: ri.ingredient.nameEn ?? "",
            unit: ri.ingredient.unit,
            pricePerUnit: Number(ri.ingredient.pricePerUnit),
            available: ri.ingredient.available,
          },
        })),
        modifierGroups: i.modifierGroups.map((g) => ({
          id: g.id,
          nameKa: g.nameKa,
          nameRu: g.nameRu,
          nameEn: g.nameEn,
          selectionType: g.selectionType === "MULTIPLE" ? ("MULTIPLE" as const) : ("SINGLE" as const),
          maxSelect: g.maxSelect,
          options: g.options.map((o) => ({
            id: o.id,
            nameKa: o.nameKa,
            nameRu: o.nameRu,
            nameEn: o.nameEn,
            priceGel: Number(o.priceGel),
          })),
        })),
      })),
    })),
  };

  const initialIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    nameKa: i.nameKa ?? "",
    nameRu: i.nameRu ?? "",
    nameEn: i.nameEn ?? "",
    unit: i.unit,
    pricePerUnit: Number(i.pricePerUnit),
    available: i.available,
  }));

  return <VenueEditor venue={initialVenue} ingredients={initialIngredients} />;
}
