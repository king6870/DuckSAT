"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Menu, X, GraduationCap, BarChart3, TrendingUp, DollarSign, Home, Info, Zap, Target } from "lucide-react"
import { ADMIN_EMAILS } from "@/constants/adminEmails"

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/practice-tests", label: "Practice Tests", icon: GraduationCap },
  { href: "/practice", label: "Drills", icon: Target },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/about", label: "About", icon: Info },
  { href: "/how-it-works", label: "How It Works", icon: Zap },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '')

  return (
    <>
      {/* Hamburger toggle — only visible on small screens */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        className="sm:hidden p-2 rounded-lg text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in panel */}
          <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                DuckSAT
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-3">
                {NAV_LINKS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors"
                    >
                      <Icon className="w-5 h-5 opacity-70" />
                      {label}
                    </Link>
                  </li>
                ))}

                {isAdmin && (
                  <li>
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-purple-700 hover:bg-purple-50 font-semibold transition-colors"
                    >
                      🔧 Admin Dashboard
                    </Link>
                  </li>
                )}
              </ul>
            </nav>

            {/* Footer: auth actions */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              {session?.user ? (
                <>
                  <div className="text-sm font-medium text-gray-700 truncate">
                    {session.user.name ?? session.user.email}
                  </div>
                  <button
                    onClick={() => { setOpen(false); signOut() }}
                    className="w-full py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/signin"
                  onClick={() => setOpen(false)}
                  className="block w-full py-2 text-center rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
