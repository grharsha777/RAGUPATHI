"use client";

import { useTheme } from "next-themes";
import { signOut } from "next-auth/react";
import { Bell, Command, Moon, Search, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/lib/store/ui-store";

export function TopCommandBar() {
  const { theme, setTheme } = useTheme();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setNotificationsOpen = useUiStore((s) => s.setNotificationsOpen);

  return (
    <TooltipProvider>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <div className="relative hidden min-w-[240px] flex-1 md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Global search"
              placeholder="Search incidents, repos, trace IDs…"
              className="h-9 pl-9"
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                  event.preventDefault();
                  setCommandOpen(true);
                }
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => setCommandOpen(true)}
                >
                  <Command className="size-4" />
                  <span className="ml-2 text-2xs text-muted-foreground">⌘K</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command palette</TooltipContent>
            </Tooltip>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Notifications"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell className="size-4" />
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:inline" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="secondary" size="sm" className="hidden sm:inline-flex">
                  Workspace
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Production</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Staging (locked)</DropdownMenuItem>
                <DropdownMenuItem disabled>DR (read-only)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm">
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Session</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
