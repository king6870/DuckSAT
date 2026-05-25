"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "./ui/theme-toggle";
import { ADMIN_EMAILS } from "@/constants/adminEmails";

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  if (status === "loading") {
    return null;
  }

  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email || '');

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      const result = await signOut({ redirect: false, callbackUrl: '/' });
      window.location.replace(result?.url || '/');
    } catch {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {session?.user ? (
        <>
          {/* Profile Image */}
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={`${session.user.name || 'User'} profile picture`}
              width={36}
              height={36}
              className="w-9 h-9 rounded-full border-2 border-indigo-200 shadow"
              unoptimized
            />
          )}
          
          {/* User Name */}
          <span className="font-medium text-[var(--color-text-secondary)] max-w-[120px] truncate">
            {session.user.name}
          </span>
          
          {/* Admin Button - Only shown for admin users */}
          {isAdmin && (
            <Link
              href="/admin"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold transition-colors shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
              aria-label="Go to Admin Dashboard"
            >
              Admin
            </Link>
          )}
          
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            aria-label="Sign out of your account"
          >
            {isSigningOut ? 'Signing Out…' : 'Sign Out'}
          </button>
        </>
      ) : (
        <>
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Sign In Button */}
          <a
            href="/auth/signin"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Sign in"
          >
            Sign In
          </a>
        </>
      )}
    </div>
  );
}
