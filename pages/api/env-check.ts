// pages/api/env-check.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const envVariables = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? { present: true, length: process.env.NEXTAUTH_SECRET.length } : { present: false },
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? { present: true, length: process.env.NEXTAUTH_URL.length } : { present: false },
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? { present: true, length: process.env.GOOGLE_CLIENT_ID.length } : { present: false },
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? { present: true, length: process.env.GOOGLE_CLIENT_SECRET.length } : { present: false },
    DATABASE_URL: process.env.DATABASE_URL ? { present: true, length: process.env.DATABASE_URL.length } : { present: false },
    DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ? { present: true, length: process.env.DATABASE_URL_UNPOOLED.length } : { present: false },
  };

  return res.status(200).json(envVariables);
}