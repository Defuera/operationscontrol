'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/', label: 'Kanban' },
  { href: '/goals', label: 'Goals' },
  { href: '/projects', label: 'Projects' },
  { href: '/journal', label: 'Journal' },
];

export function Nav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="flex max-md:hidden items-center gap-2">
      {navItems.map(item => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={isActive(item.href) ? 'default' : 'outline'}
            size="sm"
          >
            {item.label}
          </Button>
        </Link>
      ))}
    </nav>
  );
}
