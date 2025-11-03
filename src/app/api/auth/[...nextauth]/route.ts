import NextAuth from "next-auth/next"
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { getProviders, getSecret } from '@/lib/auth'

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: getProviders(),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: getSecret(),
})

export { handler as GET, handler as POST }
