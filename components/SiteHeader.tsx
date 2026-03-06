import Link from "next/link";
import { CITY_ORDER, getTheme, type CitySlug, type CityTheme } from "../lib/city";

type Props = {
  city: CitySlug;
  theme: CityTheme;
};

export default function SiteHeader({ city, theme }: Props) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

  const cityHref = (slug: CitySlug) => {
    if (!rootDomain) return "/";
    return `https://${slug}.${rootDomain}/`;
  };

  const navLinkClass = "hover:underline whitespace-nowrap";

  return (
    <div className="w-full">
      <div className="bg-white/80 backdrop-blur border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="font-extrabold tracking-tight text-lg whitespace-nowrap">
            <span style={{ color: theme.accent }}>{theme.brandName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-3 text-sm">
            <Link href="/" className={navLinkClass}>
              Featured
            </Link>
            <Link href="/events" className={navLinkClass}>
              Events
            </Link>
            <Link href="/map" className={navLinkClass}>
              Map
            </Link>
            <Link href="/categories" className={navLinkClass}>
              Categories
            </Link>
            <Link href="/calendar" className={navLinkClass}>
              Calendar
            </Link>
            <Link href="/submit" className={navLinkClass}>
              Submit
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form action="/events" method="GET" className="hidden sm:block">
              <input
                name="search"
                placeholder={`Search ${theme.displayName}...`}
                className="w-[220px] rounded-full px-4 py-2 text-sm border border-black/10 bg-white focus:outline-none"
              />
            </form>

            <div className="relative">
              <details>
                <summary className="cursor-pointer select-none rounded-full px-3 py-2 text-sm font-semibold border border-black/10 bg-white hover:bg-black/5">
                  {theme.displayName} ▾
                </summary>

                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-black/10 bg-white shadow-lg p-2 z-50">
                  <div className="text-xs uppercase tracking-wider text-black/50 px-2 pb-2">
                    Other Cities
                  </div>

                  <div className="flex flex-col">
                    {CITY_ORDER.map((slug) => {
                      const t = getTheme(slug);
                      const active = slug === city;
                      return (
                        <a
                          key={slug}
                          href={cityHref(slug)}
                          className={[
                            "px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-black/5",
                            active ? "font-semibold" : "",
                          ].join(" ")}
                        >
                          <span>{t.displayName}</span>
                          {active ? <span className="text-xs">●</span> : null}
                        </a>
                      );
                    })}
                  </div>

                  {!rootDomain ? (
                    <div className="text-[11px] text-black/50 px-2 pt-2">
                      Set NEXT_PUBLIC_ROOT_DOMAIN to enable subdomain links.
                    </div>
                  ) : null}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
