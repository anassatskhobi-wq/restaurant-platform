import Link from "next/link";
import { defaultLocale } from "@/lib/i18n";
import { listVenuesFromDb } from "@/lib/db/venues";

// Root landing page — in later phases this becomes a real tenant/venue
// picker for staff. For now it just links straight to the seeded
// venues so there's something to click during local testing.
export default async function Home() {
  const venueList = await listVenuesFromDb();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold text-neutral-800">
        Restaurant Platform — dev preview
      </h1>
      <p className="text-neutral-500">
        Pick a venue to open its guest-facing digital menu:
      </p>
      <div className="flex w-full flex-col gap-3">
        {venueList.map((venue) => (
          <Link
            key={venue.slug}
            href={`/${defaultLocale}/menu/${venue.slug}`}
            className="rounded-xl border border-neutral-200 bg-white px-5 py-4 text-left shadow-sm transition hover:shadow-md"
          >
            <div className="font-medium text-neutral-800">
              {venue.name[defaultLocale]}
            </div>
            <div className="text-sm text-neutral-500">
              {venue.address[defaultLocale]}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
