import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/generate', label: 'Generate' },
  { href: '/settings', label: 'Settings' },
];

export default function NavigationBar() {
  return (
    <nav className="topbar" aria-label="Primary navigation">
      <div className="topbar-inner">
        <ul className="topbar-menu">
          {/* Logo is no longer a link */}
          <li className="topbar-logo" aria-label="SightRead logo">
            <img src="/logo.png" alt="SightRead" className="topbar-logo-img" />
          </li>
          {navItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="topbar-link">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}