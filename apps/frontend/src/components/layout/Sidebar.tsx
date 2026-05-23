"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, BookOpen, Settings, Bot, LogOut, Plus, Sparkles } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const navItems = [
  { href: "/dashboard/chat",           label: "Chat",           icon: MessageSquare },
  { href: "/dashboard/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { href: "/dashboard/settings",       label: "Settings",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      {/* ── Brand ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-base font-bold leading-none tracking-tight">DocChat</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">AI Knowledge Base</p>
        </div>
      </div>

      <Separator />

      {/* ── New Chat ──────────────────────────────── */}
      <div className="px-3 pt-3 pb-1">
        <Button asChild className="w-full gap-2 shadow-sm" size="sm">
          <Link href="/dashboard/chat">
            <Plus className="h-4 w-4" />
            New Chat
          </Link>
        </Button>
      </div>

      {/* ── Navigation ───────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className={cn("h-4 w-4", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <Separator />

      {/* ── User + Theme ─────────────────────────── */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} alt={session?.user?.name ?? ""} />
            <AvatarFallback className="text-xs">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium leading-none">
              {session?.user?.name ?? "User"}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground leading-none">
              {session?.user?.email}
            </p>
          </div>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
