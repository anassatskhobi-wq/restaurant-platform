import { notFound } from "next/navigation";
import Link from "next/link";
import { getVenueFromDb } from "@/lib/db/venues";
import { isLocale, type Locale } from "@/lib/i18n";
import { MenuView } from "@/components/MenuView";
import { prisma } from "@/lib/prisma";
import { getStaffContext, canEditVenue } from "@/lib/admin/auth";

export default async function VenueMenuPage({
  params,
}: {
  params: { locale: string; venueSlug: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale: Locale = params.locale;

  const venue = await getVenueFromDb(params.venueSlug);
  if (!venue) notFound();

  // Полоска "Вернуться в админ-панель" видна только тому, кто реально
  // залогинен как персонал этой точки — обычные гости меню её не видят.
  const staff = await getStaffContext();
  let canReturnToAdmin = false;
  if (staff) {
    const venueAuth = await prisma.venue.findUnique({
      where: { slug: params.venueSlug },
      select: { id: true, tenantId: true },
    });
    canReturnToAdmin = !!venueAuth && canEditVenue(staff, venueAuth);
  }

  return (
    <>
      {canReturnToAdmin && (
        <div className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-center text-sm">
          <Link href={`/admin/${venue.slug}`} className="text-white underline">
            ← Вернуться в админ-панель
          </Link>
        </div>
      )}
      <MenuView venue={venue} locale={locale} />
    </>
  );
}
