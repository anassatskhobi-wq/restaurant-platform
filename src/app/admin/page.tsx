import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getStaffContext } from "@/lib/admin/auth";

export default async function AdminDashboardPage() {
  const staff = await getStaffContext();

  if (!staff) {
    return (
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <p className="text-neutral-600">
          Твой аккаунт вошёл, но пока не привязан ни к одной точке.
          Попроси администратора платформы добавить тебя.
        </p>
      </main>
    );
  }

  const venues = await prisma.venue.findMany({
    where:
      staff.role === "OWNER"
        ? { tenantId: staff.tenantId }
        : { id: staff.venueId ?? "" },
    orderBy: { slug: "asc" },
  });

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-neutral-800">
        Твои точки
      </h1>
      <ul className="flex flex-col gap-3">
        {venues.map((venue) => (
          <li key={venue.id}>
            <Link
              href={`/admin/${venue.slug}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-sm hover:border-neutral-300"
            >
              <span className="font-medium text-neutral-800">
                {venue.nameRu}
              </span>
              <span
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: venue.brandColor }}
              />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
