import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXTAUTH_SECRET_present: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_SECRET_length: process.env.NEXTAUTH_SECRET?.length ?? 0,
    NEXTAUTH_URL_present: !!process.env.NEXTAUTH_URL,
    NEXTAUTH_URL_length: process.env.NEXTAUTH_URL?.length ?? 0,
    GOOGLE_CLIENT_ID_present: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET_present: !!process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL_present: !!process.env.DATABASE_URL,
    DATABASE_URL_UNPOOLED_present: !!process.env.DATABASE_URL_UNPOOLED,
    time: new Date().toISOString(),
  });
}