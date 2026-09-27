'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useClickOutside } from '@/lib/use-click-outside';

const destinations = [
  ['Dashboard', '/'], ['Analytics', '/analytics'], ['Articles', '/articles'],
  ['Devotions', '/devotions'], ['Teachings', '/teachings'], ['Bible Kids', '/kids'], ['Daily Features', '/daily-features'], ['Ebooks', '/ebooks'],
  ['Community', '/community'], ['Users', '/users'], ['Messages', '/messages'],
  ['Finance', '/finance'], ['Settings', '/settings'],
] as const;

const roleRoutes: Record<string, string[]> = {
  content_manager: ['/', '/analytics', '/articles', '/devotions', '/teachings', '/kids', '/daily-features', '/ebooks'],
  moderator: ['/', '/community', '/users', '/messages'],
  finance_manager: ['/', '/analytics', '/finance'],
  viewer: ['/', '/analytics'],
};

export function AdminSearch({ role }: { role: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const available = useMemo(() => {
    const allowed = role === 'super_admin' ? null : new Set(roleRoutes[role] || ['/']);
    return destinations.filter(([, href]) => !allowed || allowed.has(href));
  }, [role]);
  const results = query.trim() ? available.filter(([label]) => label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  useClickOutside(rootRef, () => setFocused(false), focused);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') inputRef.current?.blur();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  function navigate(href: string) {
    setQuery('');
    setFocused(false);
    router.push(href);
  }

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-xl">
      <label className="flex h-8 items-center gap-2 border border-white/15 bg-white/10 px-3 shadow-inner transition focus-within:border-[#ffb35c]/60">
        <Search size={15} className="shrink-0 text-white/65" />
        <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 120)} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); navigate(results[0][1]); } }} className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/55 sm:text-sm" placeholder="Search admin" aria-label="Search admin" />
        <kbd className="hidden border border-white/15 bg-white/5 px-1.5 py-0.5 text-[0.62rem] text-white/45 md:block">⌘ K</kbd>
      </label>
      {focused && query.trim() ? <div className="absolute inset-x-0 top-10 overflow-hidden border border-admin-border bg-white p-1 text-admin-ink shadow-2xl">{results.length ? results.map(([label, href]) => <button key={href} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => navigate(href)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium hover:bg-admin-bg"><span>{label}</span><span className="text-xs text-admin-muted">Open</span></button>) : <p className="px-3 py-4 text-sm text-admin-muted">No matching section</p>}</div> : null}
    </div>
  );
}
