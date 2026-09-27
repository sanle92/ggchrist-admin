"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Baby,
  BarChart3,
  BookHeart,
  BookMarked,
  BookOpen,
  CircleDollarSign,
  FileText,
  Gauge,
  HeartHandshake,
  Inbox,
  LibraryBig,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { useClickOutside } from "@/lib/use-click-outside";

const groups = [
  {
    label: "Overview",
    links: [
      [Gauge, "Dashboard", "/"],
      [BarChart3, "Analytics", "/analytics"],
    ],
  },
  {
    label: "Content",
    links: [
      [FileText, "Articles", "/articles"],
      [BookHeart, "Devotions", "/devotions"],
      [BookMarked, "Teachings", "/teachings"],
      [Baby, "Bible Kids", "/kids"],
      [BookOpen, "Daily Features", "/daily-features"],
      [LibraryBig, "Ebooks", "/ebooks"],
    ],
  },
  {
    label: "People",
    links: [
      [HeartHandshake, "Community", "/community"],
      [Users, "Users", "/users"],
      [Inbox, "Messages", "/messages"],
    ],
  },
  {
    label: "Operations",
    links: [
      [CircleDollarSign, "Donations", "/donations"],
      [CircleDollarSign, "Finance", "/finance"],
      [Settings, "Settings", "/settings"],
    ],
  },
] as const;

export function AdminSidebar({
  role,
  collapsed,
  onToggle,
}: {
  role: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname() ?? "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreRef, () => setMoreOpen(false), moreOpen);
  const roleRoutes: Record<string, string[]> = {
    content_manager: [
      "/",
      "/analytics",
      "/articles",
      "/devotions",
      "/teachings",
      "/kids",
      "/daily-features",
      "/ebooks",
    ],
    moderator: ["/", "/community", "/users", "/messages"],
    finance_manager: ["/", "/analytics", "/finance", "/donations"],
    viewer: ["/", "/analytics"],
  };
  const allowed =
    role === "super_admin" ? null : new Set(roleRoutes[role] || ["/"]);
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      links: group.links.filter(([, , href]) => !allowed || allowed.has(href)),
    }))
    .filter((group) => group.links.length);
  const flatVisible = visibleGroups.flatMap((group) => group.links);
  const preferred = ["/", "/articles", "/community", "/finance"];
  const primaryMobile = preferred
    .map((href) => flatVisible.find(([, , linkHref]) => linkHref === href))
    .filter(Boolean) as typeof flatVisible;
  for (const link of flatVisible) {
    if (primaryMobile.length >= 4) break;
    if (!primaryMobile.some(([, , href]) => href === link[2]))
      primaryMobile.push(link);
  }
  const primaryHrefs = new Set(primaryMobile.map(([, , href]) => href));
  const moreMobile = flatVisible.filter(
    ([, , href]) => !primaryHrefs.has(href),
  );
  const active = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <>
      <aside
        className={clsx(
          "fixed bottom-0 left-0 top-14 z-40 hidden border-r border-admin-border bg-white transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[72px]" : "w-60",
        )}
      >
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {visibleGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed ? (
                <p className="mb-1 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-admin-muted">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 mb-2 border-t border-admin-border" />
              )}
              <div className="grid gap-0.5">
                {group.links.map(([Icon, label, href]) => (
                  <Link
                    title={collapsed ? label : undefined}
                    aria-label={label}
                    key={href}
                    href={href}
                    className={clsx(
                      "flex h-9 items-center text-[0.8125rem] font-medium transition",
                      collapsed ? "justify-center px-2" : "gap-2.5 px-2.5",
                      active(href)
                        ? "bg-[#E3F1EB] text-[#006E52]"
                        : "text-admin-ink hover:bg-admin-bg",
                    )}
                  >
                    <Icon size={17} strokeWidth={active(href) ? 2.2 : 1.8} />
                    {!collapsed ? <span>{label}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <button
          type="button"
          onClick={onToggle}
          className={clsx(
            "m-2 flex h-10 items-center border border-admin-border text-sm font-semibold text-admin-muted hover:bg-admin-bg",
            collapsed ? "justify-center" : "gap-2 px-3",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={17} />
          ) : (
            <>
              <PanelLeftClose size={17} /> Collapse sidebar
            </>
          )}
        </button>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-5 border-t border-admin-border bg-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {primaryMobile.map(([Icon, label, href]) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold",
              active(href) ? "text-admin-green" : "text-admin-muted",
            )}
          >
            <Icon size={19} />
            <span>{label === "Dashboard" ? "Home" : label}</span>
          </Link>
        ))}
        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((value) => !value)}
            className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.62rem] font-semibold text-admin-muted"
            aria-expanded={moreOpen}
          >
            <Menu size={19} />
            <span>More</span>
          </button>
          {moreOpen ? (
            <div className="absolute bottom-16 right-1 max-h-[70vh] w-56 overflow-y-auto border border-admin-border bg-white p-2 shadow-[0_8px_24px_rgba(0,0,0,.12)]">
              {moreMobile.map(([Icon, label, href]) => (
                <Link
                  onClick={() => setMoreOpen(false)}
                  key={href}
                  href={href}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-admin-bg"
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>
    </>
  );
}
