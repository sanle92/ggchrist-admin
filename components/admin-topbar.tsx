'use client';

import { useRef, useState } from 'react';
import { ChevronDown, LogOut, Search } from 'lucide-react';
import { logout } from '@/app/login/actions';
import { AdminSearch } from '@/components/admin-search';
import { NotificationCenter } from '@/components/notification-center';
import { useClickOutside } from '@/lib/use-click-outside';

export function AdminTopbar({ displayName, role }: { displayName: string; role: string }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen);
  useClickOutside(searchRef, () => setSearchOpen(false), searchOpen);
  return <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-[#202223] px-3 text-white md:px-4">
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => setSearchOpen(true)} className="md:hidden p-2 hover:bg-white/10" aria-label="Open search">
        <Search size={18} />
      </button>
      <img src="/logo-dark.png" alt="GGC Admin" className="h-auto w-[134px] hidden md:block" />
    </div>
    <div className="flex-1 hidden md:flex justify-center px-8">
      <div className="w-full max-w-md"><AdminSearch role={role} /></div>
    </div>
    <div className="md:hidden absolute left-1/2 -translate-x-1/2">
      <img src="/logo-dark.png" alt="GGC Admin" className="h-auto w-[134px]" />
    </div>
    <div className="ml-3 flex items-center gap-1">
      <NotificationCenter />
      <div ref={accountRef} className="relative">
        <button type="button" onClick={() => setAccountOpen((value) => !value)} className="flex h-9 items-center gap-2 px-1.5 hover:bg-white/10" aria-expanded={accountOpen}>
          <span className="grid size-7 place-items-center bg-admin-green text-[0.65rem] font-extrabold text-white">{displayName.slice(0, 2).toUpperCase()}</span>
          <span className="hidden max-w-28 truncate text-left text-xs font-semibold lg:block">{displayName}</span>
          <ChevronDown size={13} className="hidden text-white/55 lg:block" />
        </button>
        {accountOpen ? <div className="absolute right-0 mt-2 w-56 border border-admin-border bg-white p-2 text-admin-ink shadow-[0_8px_24px_rgba(0,0,0,.12)]"><div className="border-b border-admin-border px-3 py-2"><p className="truncate text-xs font-semibold">{displayName}</p><p className="mt-0.5 text-[0.65rem] capitalize text-admin-muted">{role.replaceAll('_', ' ')}</p></div><form action={logout} className="mt-1"><button className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold hover:bg-admin-bg"><LogOut size={15} /> Sign out</button></form></div> : null}
      </div>
    </div>
    {searchOpen ? <div ref={searchRef} className="absolute inset-x-3 top-14 p-3 bg-[#202223] border-b border-white/10 md:hidden"><AdminSearch role={role} /></div> : null}
  </header>;
}
