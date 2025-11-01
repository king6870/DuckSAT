"use client"

import { SessionProvider } from "next-auth/react"

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true}
      // Suppress errors when auth is not fully configured
      // This prevents CLIENT_FETCH_ERROR from breaking the UI
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}