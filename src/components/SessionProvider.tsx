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
      // Prevent refetch attempts when offline to avoid CLIENT_FETCH_ERROR
      // This is particularly helpful during development when auth may not be fully configured
      // Without this, SessionProvider would continuously retry failed fetches, flooding console with errors
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}