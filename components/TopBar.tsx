import Link from "next/link";

const TEAM = "By Raymond, Bryce, Gregory, Bennett & Andrew";

export default function TopBar({ active }: { active: "home" | "about" }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
          <div className="logo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 13h3l2.5-7 4 12 2.5-6H21v2h-4.6L13 21.5 9 9.5 7.4 15H3v-2z" />
            </svg>
          </div>
          <span className="brand">MarketMood</span>
        </Link>
        <nav className="topbar-nav">
          <Link href="/" className={active === "home" ? "active" : ""}>
            Home
          </Link>
          <Link href="/about" className={active === "about" ? "active" : ""}>
            How it works
          </Link>
        </nav>
        <span className="topbar-team">{TEAM}</span>
      </div>
    </header>
  );
}
