This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

Before running the application, ensure all required environment variables are set. The build process includes automatic validation that checks for:

- `NEXTAUTH_SECRET` - Authentication secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `DATABASE_URL` - Database connection string (pooled)
- `DATABASE_URL_UNPOOLED` - Database connection string (direct)

**Note:** The build will fail with a clear error message if any required variable is missing. See `docs/VERCEL_ENV_SETUP.md` for detailed setup instructions.

### Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment Variable Validation

This project includes **build-time environment variable validation** to prevent deployment with missing configuration. 

- **Automatic Check:** Before each build, `scripts/check-env.js` validates all required environment variables
- **Fail-Fast:** If any required variable is missing, the build fails immediately with a clear error message
- **Security:** Variable presence and length are logged, but actual values are never exposed
- **Local Development:** The validation runs in local builds too, showing you immediately if any configuration is missing

To see the validation in action, run:
```bash
npm run build
```

The prebuild script will display the status of all required environment variables before the Next.js build begins.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

**Important:** Before deploying, ensure all required environment variables are configured in Vercel Dashboard → Settings → Environment Variables. The build will fail if any are missing.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details, and see `docs/VERCEL_ENV_SETUP.md` for environment variable setup instructions.
