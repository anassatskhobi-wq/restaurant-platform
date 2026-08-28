import Link from "next/link";
import { locales, localeNames, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  venueSlug,
  activeLocale,
}: {
  venueSlug: string;
  activeLocale: Locale;
}) {
  return (
    <div className="flex gap-2">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={`/${locale}/menu/${venueSlug}`}
          className={`rounded-full px-3 py-1 text-sm font-medium transition ${
            locale === activeLocale
              ? "bg-neutral-900 text-white"
              : "bg-white/70 text-neutral-700 hover:bg-white"
          }`}
        >
          {localeNames[locale]}
        </Link>
      ))}
    </div>
  );
}
