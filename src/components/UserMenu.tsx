"use client";
import { useSession, signIn, signOut } from "next-auth/react";

export default function UserMenu() {
  const { data: session, status } = useSession();
  if (status === "loading") return null;
  return (
    <div className="flex items-center gap-4">
      {session?.user ? (
        <>
          {session.user.image && (
            <img src={session.user.image} alt="Profile" className="w-9 h-9 rounded-full border-2 border-indigo-200 shadow" />
          )}
          <span className="font-medium text-gray-700 max-w-[120px] truncate">{session.user.name}</span>
          <button
            onClick={() => signOut()}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold"
          >
            Sign Out
          </button>
        </>
      ) : (
        <button
          onClick={() => signIn("google")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-semibold"
        >
          Sign In
        </button>
      )}
    </div>
  );
}
