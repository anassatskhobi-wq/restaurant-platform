import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";
import { TablesPanel } from "./TablesPanel";

// Столики точки — каждый со своей ссылкой на гостевое меню (?table=<id>),
// которую печатают как QR-код на стол. Открытая по такой ссылке страница
// меню привязывает заказ к столу и включает кнопку "Позвать официанта".
export default async function TablesPage({
  params,
}: {
  params: { venueSlug: string };
}) {
  const staff = await getStaffContext();
  if (!staff) redirect("/admin");

  const venue = await prisma.venue.findUnique({ where: { slug: params.venueSlug } });
  if (!venue) notFound();
  if (!canEditVenue(staff, venue)) redirect("/admin");

  const tables = await prisma.table.findMany({
    where: { venueId: venue.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <TablesPanel
      venueId={venue.id}
      venueSlug={venue.slug}
      venueName={venue.nameRu}
      initialTables={tables.map((t) => ({ id: t.id, label: t.label }))}
    />
  );
}
