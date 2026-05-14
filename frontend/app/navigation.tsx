import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/explorer", label: "Explorer" },
  { href: "/recommendations", label: "Routes" },
  { href: "/farming", label: "Farming" },
  { href: "/side-quests", label: "Side Quests" },
  { href: "/profile", label: "Profile" },
  { href: "/search", label: "Search" },
  { href: "/quality", label: "Quality" },
];

export function AppNavigation() {
  return (
    <header className="appHeader">
      <Link className="brandMark" href="/" aria-label="Toram Adventurer Ledger dashboard">
        <span className="brandSigil" aria-hidden="true">
          TAL
        </span>
        <span>
          <strong>Toram Adventurer Ledger</strong>
          <small>Field routes from validated data</small>
        </span>
      </Link>
      <nav className="globalNav" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
