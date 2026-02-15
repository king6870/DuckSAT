"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { ThemeToggle } from "./ui/theme-toggle";

export default function UserMenu() {
  const { data: session, status } = useSession();
  
  if (status === "loading") {
    return null;
  }

  // Check if current user is an admin - hardcoded list
  const userEmail = session?.user?.email || '';
  const isAdmin = userEmail === 'lionvihaan@gmail.com' || userEmail === 'kingjacobisthegoat@gmail.com';

  return (
    <div className="flex items-center gap-4">
      {session?.user ? (
        <>
          {/* Profile Image */}
          {session.user.image && (
            <img 
              src={session.user.image} 
              alt={`${session.user.name || 'User'} profile picture`}
              className="w-9 h-9 rounded-full border-2 border-indigo-200 shadow" 
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
            onClick={() => signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            aria-label="Sign out of your account"
          >
            Sign Out
          </button>
        </>
      ) : (
        <>
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* Sign In Button */}
          <button
            onClick={() => signIn("google")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            aria-label="Sign in with Google"
          >
            Sign In
          </button>
        </>
      )}
    </div>
  );
}
