import Link from 'next/link';
import { FaMusic, FaHome, FaCog } from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: <FaHome /> },
  { href: '/generate', label: 'Generate', icon: <FaMusic /> },
  { href: '/settings', label: 'Settings', icon: <FaCog /> },
];

export default function Sidebar() {
  return (
    <nav style={{
      width: '200px',
      height: '100vh',
      background: '#222',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem 0'
    }}>
      {navItems.map(item => (
        <Link key={item.href} href={item.href} style={{
          display: 'flex',
          alignItems: 'center',
          padding: '1rem',
          textDecoration: 'none',
          color: 'inherit'
        }}>
          <span style={{ marginRight: '1rem', fontSize: '1.5rem' }}>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}