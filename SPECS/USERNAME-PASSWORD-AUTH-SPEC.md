# Username + Password Authentication — Full Specification

**Status:** Pending implementation  
**Do not touch code until explicitly instructed.**

---

## 1. Overview

Add a **username + password** sign-in option as a second authentication method alongside the existing Google OAuth. Users choose one or the other — they are fully independent login paths.

- No email address required for username/password accounts
- Username is the unique identifier (not email)
- Password is hashed with bcrypt before storage
- Users who sign up with username/password get a synthetic internal email (`<username>@duck.local`) stored in the DB to satisfy the existing `email UNIQUE` constraint — this value is never shown to the user and never emailed
- The existing Google sign-in flow is **unaffected** — Google users still sign in exactly as before

---

## 2. Scope

| Area | In scope |
|---|---|
| Username + password sign-up (new account) | ✅ |
| Username + password sign-in | ✅ |
| Integration into existing `/auth/signin` page | ✅ |
| NextAuth `CredentialsProvider` | ✅ |
| bcrypt password hashing | ✅ |
| Schema: `username` + `passwordHash` fields on `User` | ✅ |
| Migration (idempotent SQL) | ✅ |
| "Forgot password" / password reset | ❌ (future) |
| Merging Google and username accounts | ❌ (future) |
| Email verification for username accounts | ❌ (not needed — no email collected) |
| Username change after registration | ❌ (future) |
| Admin user management | ❌ (future) |

---

## 3. UI

### 3.1 Sign-In Page (`/auth/signin`)

The existing page currently shows only a "Continue with Google" button. Add a username/password form **below** the Google button, separated by an `OR` divider.

```
┌─────────────────────────────────────────┐
│           DuckSAT                       │
│   Sign in to continue your SAT prep     │
│                                         │
│  [ G  Continue with Google          ]   │
│                                         │
│  ──────────────── OR ───────────────    │
│                                         │
│  Username                               │
│  [ ________________________________ ]   │
│                                         │
│  Password                               │
│  [ ________________________________ ]   │
│                                         │
│  [ Sign In ]                            │
│                                         │
│  Don't have an account? Sign up         │  ← link to /auth/signup
│                                         │
└─────────────────────────────────────────┘
```

**Form behavior:**
- `Enter` key submits the form
- Inline error shown below the button: `"Invalid username or password."` (generic — never reveal which field is wrong)
- Loading spinner on submit button while request is in flight
- Inputs have `autocomplete="username"` and `autocomplete="current-password"`

### 3.2 Sign-Up Page (`/auth/signup`) — NEW PAGE

A new page at `/auth/signup`:

```
┌─────────────────────────────────────────┐
│           DuckSAT                       │
│   Create your account                   │
│                                         │
│  Username                               │
│  [ ________________________________ ]   │
│  (letters, numbers, underscores, 3–20 chars)
│                                         │
│  Password                               │
│  [ ________________________________ ]   │
│  (min 8 characters)                     │
│                                         │
│  Confirm Password                       │
│  [ ________________________________ ]   │
│                                         │
│  [ Create Account ]                     │
│                                         │
│  Already have an account? Sign in       │  ← link to /auth/signin
│                                         │
└─────────────────────────────────────────┘
```

**Validation (client-side, shown inline):**
- Username: 3–20 chars, only `[a-zA-Z0-9_]`. Error: `"Username must be 3–20 characters (letters, numbers, underscores only)."`
- Password: min 8 chars. Error: `"Password must be at least 8 characters."`
- Confirm password: must match. Error: `"Passwords don't match."`

**On submit:**
1. Client validates → if any error, show inline and stop
2. POST to `POST /api/auth/signup`
3. On success → auto sign-in via `signIn('credentials', ...)` → redirect to onboarding or `callbackUrl`
4. On `username_taken` → show: `"That username is already taken."`
5. On other errors → show: `"Something went wrong. Please try again."`

No "Continue with Google" option on this page — it is only for username/password registration.

---

## 4. Data Model

### 4.1 New fields on `User`

```prisma
  username     String?   @unique  // null for Google-only accounts
  passwordHash String?            // bcrypt hash, null for Google-only accounts
```

- `username` is `@unique` (enforced at DB level)
- `passwordHash` is never exposed via any API or session
- `email` continues to be required by the NextAuth PrismaAdapter. For username accounts, set it to `<username>@duck.local` — this value is purely technical and never displayed or used for communication

### 4.2 Migration (idempotent SQL)

```sql
-- Add username column (nullable, unique)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
)
BEGIN
  ALTER TABLE users ADD username NVARCHAR(20) NULL;
  CREATE UNIQUE INDEX UQ_users_username ON users(username)
    WHERE username IS NOT NULL;  -- partial unique index allows multiple NULLs
END;

-- Add passwordHash column (nullable)
IF NOT EXISTS (
  SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'passwordHash'
)
BEGIN
  ALTER TABLE users ADD passwordHash NVARCHAR(255) NULL;
END;
```

> Note: Azure SQL supports partial unique indexes via filtered indexes — this allows multiple Google users to have `username = NULL` without violating the constraint.

---

## 5. API Endpoints

### 5.1 `POST /api/auth/signup`

**Auth:** None (public endpoint)  
**Purpose:** Register a new username/password account

**Request body:**
```json
{
  "username": "john_doe",
  "password": "mypassword123"
}
```

**Server-side validation:**
- `username`: required, 3–20 chars, regex `^[a-zA-Z0-9_]+$` — reject with 400 if invalid
- `password`: required, min 8 chars — reject with 400 if too short
- Check `username` uniqueness in DB (case-insensitive: `john_doe` and `John_Doe` are the same) — reject with 409 if taken

**On success:**
1. Hash password with `bcrypt` (cost factor 12)
2. Create `User` record with:
   - `username`: lowercased username
   - `email`: `<lowercased_username>@duck.local`
   - `passwordHash`: bcrypt hash
   - `name`: same as username (display name)
3. Return `201 { success: true }`

**Responses:**

| Code | Body | Condition |
|---|---|---|
| 201 | `{ success: true }` | User created |
| 400 | `{ error: "invalid_username" }` | Username fails format/length rules |
| 400 | `{ error: "password_too_short" }` | Password < 8 chars |
| 409 | `{ error: "username_taken" }` | Username already exists |
| 500 | `{ error: "server_error" }` | DB failure |

**Security:**
- The route must NOT reveal whether an email address exists in the system (not applicable here — no email collected)
- Rate limit: max 5 signup attempts per IP per 10 minutes (to prevent username enumeration via timing attacks) — implement via a simple in-memory counter for now

### 5.2 NextAuth `CredentialsProvider` (in `src/lib/auth.ts`)

```ts
CredentialsProvider({
  name: 'Username',
  credentials: {
    username: { label: 'Username', type: 'text' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials) {
    if (!credentials?.username || !credentials?.password) return null;

    const user = await prisma.user.findFirst({
      where: { username: credentials.username.toLowerCase() },
      select: { id, username, name, image, passwordHash }
    });

    if (!user?.passwordHash) return null;

    const valid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!valid) return null;

    return { id: user.id, name: user.name, image: user.image };
  }
})
```

- Returns `null` for any failure (NextAuth converts this to an error redirect)
- `passwordHash` is selected only within `authorize()` and never forwarded to the session
- Username lookup is case-insensitive (stored lowercase, query lowercased)

---

## 6. Session & Callbacks

The existing session callback already attaches `user.id` to the session — no changes needed there.

However: `CredentialsProvider` in NextAuth requires `session.strategy: 'jwt'` OR a custom adapter behavior. The current app uses `session.strategy: 'database'` (PrismaAdapter). 

**Solution:** Keep `session.strategy: 'database'` for Google sessions. For credentials, NextAuth with the PrismaAdapter will create a session row in the DB automatically as long as `authorize()` returns a user object with `id`.

> If NextAuth requires `jwt` strategy for credentials: switch the whole app to `jwt` strategy. The `session` callback currently reads `user.id` from the `user` arg — in JWT mode this comes from `token.sub` instead. The callback needs a small update to handle both. See §8 Edge Cases.

---

## 7. Files to Create / Modify

> ⚠️ DO NOT create or modify any of these until explicitly instructed.

### New files:
```
src/app/auth/signup/page.tsx            ← registration form
src/app/api/auth/signup/route.ts        ← POST /api/auth/signup
scripts/migrate-add-username-password.sql  ← idempotent DB migration
```

### Modified files:
```
src/lib/auth.ts                         ← add CredentialsProvider + handle jwt vs database strategy
src/app/auth/signin/page.tsx            ← add username/password form + OR divider
prisma/schema.prisma                    ← add username + passwordHash to User model
```

### New dependency:
```
bcryptjs   (npm install bcryptjs @types/bcryptjs)
```

> Prefer `bcryptjs` (pure JS) over native `bcrypt` to avoid native module compilation issues on Azure App Service.

---

## 8. Edge Cases

| Scenario | Behavior |
|---|---|
| User tries username that differs only by case (`John` vs `john`) | Rejected as taken — all usernames stored and compared lowercase |
| Google user tries to sign up with username/password using same "email" | Impossible — Google users have real emails, not `@duck.local` |
| Username/password user tries Google sign in | Google requires a real email — they cannot sign in via Google unless they have a Google account linked separately (out of scope v1) |
| `session.strategy` conflict with CredentialsProvider | If NextAuth rejects database sessions for credentials: switch entire app to `jwt` strategy; update session callback to read `id` from `token.sub` for all providers |
| User submits empty form | Client validation catches it before submit |
| Network error during signup | Show `"Something went wrong. Please try again."` — do not auto-retry |
| `passwordHash` in API response | Never allowed — select only `id`, `name`, `image` in authorize(); `passwordHash` is never in session or any response body |
| Username `@duck.local` email collision | Prevented by username uniqueness constraint (usernames are unique → emails are unique) |
| Existing Google users with `username = NULL` | Unaffected — Google sign-in path does not touch `username` or `passwordHash` |
| User signs up, then tries to link Google account later | Out of scope for v1 — two separate accounts would exist |

---

## 9. Security Checklist

- [x] Passwords hashed with bcrypt (cost 12) — never stored plaintext
- [x] `passwordHash` never returned from any API or included in session/JWT
- [x] Generic error message on login failure — never reveals whether username exists
- [x] Username stored and compared lowercase — no case-variation enumeration
- [x] Signup rate-limited per IP — prevents username enumeration and brute force at registration
- [x] `@duck.local` emails are clearly synthetic and never sent external communications
- [x] `username` validated server-side with strict regex — no injection risk
- [x] NEXTAUTH_SECRET signs all JWTs (or session tokens) — existing requirement unchanged
