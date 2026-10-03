'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavLinkItem {
  label: string;
  href: string;
}

export function isRouteActive(currentPath: string, targetHref: string): boolean {
  if (!currentPath) return false;
  const normCurrent = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '');
  const normTarget = targetHref === '/' ? '/' : targetHref.replace(/\/+$/, '');

  // Exact match
  if (normCurrent === normTarget) return true;

  // Server Approvals is active for /server-approvals, /operations, and child /recovery
  if (normTarget === '/server-approvals' || normTarget === '/operations') {
    if (
      normCurrent === '/server-approvals' ||
      normCurrent === '/operations' ||
      normCurrent === '/recovery' ||
      normCurrent.startsWith('/server-approvals/') ||
      normCurrent.startsWith('/operations/')
    ) {
      return true;
    }
  }

  // Other routes (e.g. /servers, /tasks, /observability, /notifications)
  // Ensure we NEVER highlight a section route when on / or /dashboard
  if (normTarget !== '/' && normTarget !== '/dashboard') {
    return normCurrent === normTarget || normCurrent.startsWith(`${normTarget}/`);
  }

  return false;
}

interface AppNavProps {
  items?: NavLinkItem[];
  className?: string;
  userEmail?: string;
}

export const DEFAULT_MAIN_NAV: NavLinkItem[] = [
  { label: 'Servers', href: '/servers' },
  { label: 'Observability', href: '/observability' },
  { label: 'Tasks', href: '/tasks' },
  { label: 'Server Approvals', href: '/server-approvals' },
  { label: 'Security Emails', href: '/notifications' },
];

export function ReturnToDashboardButton({ className = '' }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`ryvix-return-dashboard-btn ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.42rem 0.95rem',
        fontSize: '0.82rem',
        fontWeight: 600,
        borderRadius: '8px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease-in-out',
        color: '#38bdf8',
        background: 'rgba(56, 189, 248, 0.1)',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 0 12px rgba(56, 189, 248, 0.15)',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>↩</span>
      <span>Return to Dashboard</span>
    </Link>
  );
}

export default function AppNav({ items, className = '', userEmail }: AppNavProps) {
  const pathname = usePathname() || '';
  const navItems = items || DEFAULT_MAIN_NAV;

  return (
    <nav
      className={`ryvix-nav-bar ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      {userEmail && (
        <span
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #94a3b8)',
            marginRight: '0.25rem',
          }}
        >
          {userEmail}
        </span>
      )}

      {navItems.map((item) => {
        const active = isRouteActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`ryvix-nav-link ${active ? 'active' : 'inactive'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.42rem 0.85rem',
              fontSize: '0.82rem',
              borderRadius: '8px',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease-in-out',
              boxSizing: 'border-box',
              fontWeight: active ? 600 : 500,
              color: active ? '#ffffff' : '#94a3b8',
              background: active ? 'rgba(56, 189, 248, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              border: active
                ? '1px solid rgba(56, 189, 248, 0.5)'
                : '1px solid rgba(255, 255, 255, 0.1)',
              borderBottom: active ? '2px solid #38bdf8' : '2px solid transparent',
              boxShadow: active ? '0 0 14px rgba(56, 189, 248, 0.25)' : 'none',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
