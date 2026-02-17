"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

interface AuthUser {
  name: string;
  role: "ADMIN" | "AUTHOR";
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.isLoggedIn) {
          setUser({ name: data.name, role: data.role });
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        {/* Logo + Title */}
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-accent transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="" className="w-7 h-7" aria-hidden="true" />
          乐之翁
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <Link href="/about" className="text-muted hover:text-foreground transition-colors">
            关于
          </Link>
          {user && (
            <>
              <Link href="/write" className="text-muted hover:text-foreground transition-colors">
                写文章
              </Link>
              <Link href="/drafts" className="text-muted hover:text-foreground transition-colors">
                我的草稿
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/settings" className="text-muted hover:text-foreground transition-colors">
                  设置
                </Link>
              )}

              {/* User dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tag-bg text-foreground font-medium hover:bg-border transition-colors cursor-pointer"
                >
                  <span className="w-5 h-5 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">
                    {user.name.charAt(0)}
                  </span>
                  {user.name}
                  <svg className={`w-3.5 h-3.5 text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-card border border-border rounded-lg shadow-lg py-1 z-50">
                    <Link
                      href={`/author/${encodeURIComponent(user.name)}`}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-tag-bg transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      个人主页
                    </Link>
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => { setDropdownOpen(false); handleLogout(); }}
                      className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-tag-bg transition-colors cursor-pointer"
                    >
                      退出
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-md hover:bg-tag-bg transition-colors cursor-pointer"
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
        </nav>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-md hover:bg-tag-bg transition-colors cursor-pointer"
            aria-label="切换主题"
          >
            {theme === "dark" ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2.5 rounded-md hover:bg-tag-bg transition-colors cursor-pointer"
            aria-label="菜单"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <nav className="sm:hidden border-t border-border bg-card px-4 py-3 space-y-2 text-sm">
          <Link href="/about" className="block text-muted hover:text-foreground py-3" onClick={() => setMenuOpen(false)}>
            关于
          </Link>
          {user && (
            <>
              <Link href="/write" className="block text-muted hover:text-foreground py-3" onClick={() => setMenuOpen(false)}>
                写文章
              </Link>
              <Link href="/drafts" className="block text-muted hover:text-foreground py-3" onClick={() => setMenuOpen(false)}>
                我的草稿
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/settings" className="block text-muted hover:text-foreground py-3" onClick={() => setMenuOpen(false)}>
                  设置
                </Link>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-muted">{user.name}</span>
                <button onClick={handleLogout} className="text-muted hover:text-foreground cursor-pointer py-3">
                  退出
                </button>
              </div>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
