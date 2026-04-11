# DuckSAT Product Backlog

This document contains the full product backlog for DuckSAT, organized into logical Epics and broken down into actionable User Stories and Technical Tasks.

---

## Epic 1: Identity & Onboarding

**Goal:** Allow users to securely create accounts, log in, and personalize their learning experience right from the start.

### User Stories

- [ ] **[Story]** As a student, I want to sign up and log in using my Google account so I can access the platform quickly without remembering a new password.
- [ ] **[Story]** As a student, I want to create an account using a username and password (securely hashed via bcrypt) so I can use the platform without a Google account.
- [ ] **[Story]** As a student logging in for the first time, I want to complete a 5-step onboarding survey (grade, previous score, apps used, strong/weak subjects, target score) so the platform can tailor my experience.

### Technical Tasks

- [ ] **[Task]** Implement NextAuth v4 with JWT strategy for session management.
- [ ] **[Task]** Build custom error pages for authentication failures.

---

## Epic 2: Core Learning & Practice Engine

**Goal:** Deliver a high-fidelity, interactive SAT practice experience featuring full-length tests and targeted drills.

### User Stories

- [ ] **[Story]** As a student, I want to take a full simulated SAT test (4 modules, ~98 questions) with a timer so I can practice under real test conditions.
- [ ] **[Story]** As a student, I want to see questions formatted accurately with math equations (KaTeX), charts (Vega-Lite), and diagrams (SVG) so the practice mirrors the actual exam.
- [ ] **[Story]** As a student, I want to select different test difficulties (Diagnostic, Standard, Advanced) to match my current skill level.
- [ ] **[Story]** As a student, I want to use "Drill Mode" to practice specific subjects (e.g., Algebra, Grammar) and difficulties so I can target my weak points.
- [ ] **[Story]** As a student, I want to see my correct/incorrect streaks and time spent per question in Drill Mode to gamify and track my focus.
- [ ] **[Story]** As a student, I want to browse all available questions, filter them, and read detailed explanations (including why other answers are wrong) to learn from my mistakes.
- [ ] **[Story]** As a student, I want to rate individual questions (1–5 stars) and submit general site feedback to help improve the platform.

---

## Epic 3: Student Dashboard & Analytics

**Goal:** Provide students with clear, actionable insights into their performance and progress over time.

### User Stories

- [ ] **[Story]** As a student, I want to see my total tests completed, average score, and best score on a central dashboard.
- [ ] **[Story]** As a student, I want to see my real SAT equivalent score (400–1600, split between RW and Math) after completing a practice test.
- [ ] **[Story]** As a student, I want to view a score progression chart over time to see if my studying is paying off.
- [ ] **[Story]** As a student, I want to see a breakdown of my performance by category, subject, and difficulty to know exactly what I need to study next.

---

## Epic 4: Monetization & Subscriptions (Stripe)

**Goal:** Implement a freemium model with secure payment processing and feature gating.

### User Stories

- [ ] **[Story]** As a free user, I want to be able to take 1 practice test per month so I can evaluate the platform before paying.
- [ ] **[Story]** As a student, I want to upgrade to a Monthly or Yearly subscription via Stripe Checkout to unlock unlimited practice tests and drills.
- [ ] **[Story]** As a premium user, I want to manage my billing and subscription through a secure customer portal.
- [ ] **[Story]** As a user, I want to be able to redeem promo codes during checkout for discounted access.

### Technical Tasks

- [ ] **[Task]** Implement Stripe Webhooks to sync subscription status (active, past_due, canceled) with the AuthUser database model.

---

## Epic 5: Admin Content Management & AI Generation

**Goal:** Give administrators powerful tools to create, review, and organize the massive question bank.

### User Stories

- [ ] **[Story]** As an admin, I want full CRUD (Create, Read, Update, Delete) capabilities for questions, including uploading images and tagging metadata.
- [ ] **[Story]** As an admin, I want to use OpenAI to generate single, batch, or enhanced (diagram-included) questions based on difficulty, category, and subtopic to rapidly scale the question bank.
- [ ] **[Story]** As an admin, I want to review a queue of pending AI-generated questions, rate their accuracy, leave comments, and approve/reject them before they go live.
- [ ] **[Story]** As an admin, I want a Practice Test Builder to manually assign specific questions to the 4 modules and publish them as named tests.
- [ ] **[Story]** As an admin, I want to create and manage Topics (e.g., Math) and Subtopics (e.g., Linear Equations) and track how many questions exist for each against our targets.

---

## Epic 6: Admin Analytics & System Monitoring

**Goal:** Allow administrators to monitor platform health, user engagement, and learning trends.

### User Stories

- [ ] **[Story]** As an admin, I want to view a dashboard listing all users and their individual engagement statistics.
- [ ] **[Story]** As an admin, I want to view site analytics (page views, dwell time, scroll depth, device type) and an engagement heatmap to see how users interact with the site.
- [ ] **[Story]** As an admin, I want to review aggregate learning analytics (category performance, difficulty distribution, topic mastery) to understand where students struggle the most.
- [ ] **[Story]** As an admin, I want to review all submitted user feedback and question ratings in one place.

### Technical Tasks

- [ ] **[Task]** Maintain health check endpoints (`/api/health`, `/api/admin/health-check`, `/api/env-check`) to ensure the DB, admin routes, and environment variables are functioning.

---

## Epic 7: Infrastructure & Architecture (Technical Backlog)

**Goal:** Establish the foundational tech stack, database schema, API routing, and backend scripts.

| Component | Tasks & Requirements |
|-----------|----------------------|
| **Framework & UI** | Next.js 15.5.7 (standalone output), React 18, TypeScript, Tailwind CSS 4, Radix UI, Lucide Icons. |
| **Database (Prisma & SQL Server)** | Implement the 20 DB models across Domain, Content, Tests, Results, Progress, and Tracking categories. Maintain data blobs for Vega-Lite/SVG. |
| **API Endpoints** | Build and route the 56 required REST API endpoints (Auth, Questions, Tests, Results, Tracking, Stripe, Admin, Health). Validate payloads with Zod. |
| **AI Pipelines** | Integrate Azure OpenAI / OpenAI API for the unified generation workflow (TypeScript + Python scripts). |
| **Data Scripts** | Maintain 100+ utility scripts for batch importing, test seeding, LaTeX validation, migrations, and quality audits. |
| **Deployment** | Configure GitHub Actions for CI/CD pipeline to deploy to Azure App Service Linux. |

### Technical Tasks

- [ ] **[Task]** Set up Next.js 15.5.7 with standalone output, React 18, TypeScript, Tailwind CSS 4, Radix UI, and Lucide Icons.
- [ ] **[Task]** Implement the 20 DB models (Domain, Content, Tests, Results, Progress, Tracking categories) using Prisma with SQL Server.
- [ ] **[Task]** Support Vega-Lite and SVG data blobs in the database schema.
- [ ] **[Task]** Build and route all 56 required REST API endpoints (Auth, Questions, Tests, Results, Tracking, Stripe, Admin, Health).
- [ ] **[Task]** Validate all API payloads with Zod schemas.
- [ ] **[Task]** Integrate Azure OpenAI / OpenAI API for the unified question generation workflow (TypeScript + Python scripts).
- [ ] **[Task]** Maintain 100+ utility scripts for batch importing, test seeding, LaTeX validation, migrations, and quality audits.
- [ ] **[Task]** Configure GitHub Actions CI/CD pipeline to deploy to Azure App Service Linux.

---

*Last updated: 2026-04-11*
