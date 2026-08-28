import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";
import { OperatorPanel } from "./OperatorPanel";

// Упрощённая страница для сотрудника (роль OPERATOR): только вкл/выкл
// блюд и ингредиентов, без цен, себестоимости, состава и фото.
export default async function OperatorPage({
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
          },
        },
      },
    },
  });

  if (!venue) notFound();
  if (!canEditVenue(staff, venue)) redirect("/admin");

  const ingredients = await prisma.ingredient.findMany({
    where: { venueId: venue.id },
    orderBy: { name: "asc" },
  });

  const initialCategories = venue.categories.map((c) => ({
    id: c.id,
    nameRu: c.nameRu,
    items: c.items.map((i) => ({
      id: i.id,
      nameRu: i.nameRu,
      available: i.available,
    })),
  }));

  const initialIngredients = ingredients.map((i) => ({
    id: i.id,
    name: i.name,
    unit: i.unit,
    available: i.available,
  }));

  return (
    <OperatorPanel
      venueName={venue.nameRu}
      initialCategories={initialCategories}
      initialIngredients={initialIngredients}
    />
  );
}
