import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | DuckSAT',
  description: 'How DuckSAT collects, uses, and protects your personal information.',
}

const EFFECTIVE_DATE = 'June 9, 2026'
const CONTACT_EMAIL = 'support@ducksat.com'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
            <span className="text-sm font-semibold text-indigo-700">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
            <span className="text-gray-300">|</span>
            <Link href="/cookies" className="text-indigo-600 hover:underline">Cookie Policy</Link>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 px-8 py-10 sm:px-12 sm:py-14 space-y-10 text-gray-700 leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              DuckSAT (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website at{' '}
              <strong>ducksat.com</strong>. This Privacy Policy explains how we collect, use, share, and protect
              information about you when you use our Service. By using DuckSAT, you consent to the practices
              described here.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.1 Account Information</h3>
            <p>
              When you create an account, we collect:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>
                <strong>Credentials accounts:</strong> username and hashed password. We generate a synthetic
                email address (<code>username@duck.local</code>) that is never sent externally.
              </li>
              <li>
                <strong>Google OAuth accounts:</strong> your Google profile name, email address, and profile
                picture URL as provided by Google.
              </li>
              <li>
                <strong>Optional onboarding data:</strong> SAT target score, planned test date, study goals —
                if you choose to provide them.
              </li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.2 Usage and Performance Data</h3>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Answers to practice questions and drills (correct/incorrect, time taken).</li>
              <li>Practice test scores, module-level results, and historical score trends.</li>
              <li>Topics studied, drills completed, and streaks.</li>
              <li>Pages visited and time spent on the site (via analytics).</li>
            </ul>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.3 Payment Information</h3>
            <p>
              Payments are processed by <strong>Stripe, Inc.</strong> We never receive or store your full
              card number, CVV, or bank account details. We store only the Stripe Customer ID and
              subscription status returned by Stripe.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.4 Feedback</h3>
            <p>
              If you submit a rating or written review through the feedback widget, we store your rating
              (1–5 stars), your optional written review (up to 500 characters), the page URL where you
              submitted it, and your user account if you were logged in.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.5 Communications</h3>
            <p>
              If you have a real email address on file (Google OAuth accounts), we may send you transactional
              emails (billing receipts, account notices) and, with your consent, promotional communications.
              You can unsubscribe at any time via the link in any email we send.
            </p>

            <h3 className="text-base font-semibold text-gray-800 mt-4 mb-2">2.6 Technical Data</h3>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>IP address (used for rate limiting; not stored long-term).</li>
              <li>Browser user-agent string.</li>
              <li>Cookies and localStorage items described in our{' '}
                <Link href="/cookies" className="text-indigo-600 hover:underline">Cookie Policy</Link>.
              </li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Providing the Service:</strong> authenticating you, tracking your progress, generating
                personalized recommendations, and running AI tutoring features.
              </li>
              <li>
                <strong>Billing:</strong> processing subscription payments and managing your plan.
              </li>
              <li>
                <strong>Communications:</strong> sending receipts, password/account notices, and (if opted in)
                study reminders and feature announcements.
              </li>
              <li>
                <strong>Improving the Service:</strong> analyzing aggregate usage to improve question quality,
                site performance, and feature design.
              </li>
              <li>
                <strong>Safety and compliance:</strong> detecting abuse, enforcing our Terms of Service, and
                complying with legal obligations.
              </li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. How We Share Your Information</h2>
            <p>We do <strong>not</strong> sell your personal information. We share it only:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>
                <strong>Stripe, Inc.</strong> — to process payments. Stripe&apos;s privacy policy applies to
                data you provide during checkout.
              </li>
              <li>
                <strong>Google LLC</strong> — if you sign in with Google, your authentication data is governed
                by Google&apos;s Privacy Policy.
              </li>
              <li>
                <strong>Resend, Inc.</strong> — to deliver transactional emails. Your email address is
                transmitted to Resend for delivery.
              </li>
              <li>
                <strong>Meta Platforms, Inc.</strong> — if you accept analytics cookies, Meta Pixel may transmit
                page view events. You can opt out via our{' '}
                <Link href="/cookies" className="text-indigo-600 hover:underline">Cookie Policy</Link>.
              </li>
              <li>
                <strong>Microsoft Azure</strong> — our cloud infrastructure provider stores all application
                data (database, server logs) in Azure data centers in the United States.
              </li>
              <li>
                <strong>Legal requirements:</strong> if required by law, court order, or to protect the rights
                of DuckSAT or others.
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Account data:</strong> retained as long as your account is active. If you delete your
                account, we delete your personal data within 30 days, except where required to be retained
                by law (e.g., billing records for 7 years).
              </li>
              <li>
                <strong>Practice results and scores:</strong> retained as long as your account is active.
              </li>
              <li>
                <strong>Server logs and IP addresses:</strong> retained for up to 30 days for security
                purposes.
              </li>
              <li>
                <strong>Feedback and reviews:</strong> retained indefinitely unless you request deletion.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Security</h2>
            <p>
              We use industry-standard safeguards including HTTPS encryption in transit, bcrypt password
              hashing (cost factor 12), and Azure SQL encryption at rest. However, no method of transmission
              or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Children&apos;s Privacy</h2>
            <p>
              DuckSAT is intended for users aged 13 and older. We do not knowingly collect personal
              information from children under 13. If you believe we have collected information from a child
              under 13, please contact us immediately and we will delete it.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
            <p>
              Depending on your location, you may have rights regarding your personal data, including:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-sm">
              <li>
                <strong>Access:</strong> request a copy of the personal data we hold about you.
              </li>
              <li>
                <strong>Correction:</strong> ask us to correct inaccurate information.
              </li>
              <li>
                <strong>Deletion:</strong> request deletion of your account and associated personal data.
              </li>
              <li>
                <strong>Portability:</strong> receive your data in a machine-readable format.
              </li>
              <li>
                <strong>Opt-out of marketing:</strong> unsubscribe from promotional emails at any time.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline">{CONTACT_EMAIL}</a>.
              We will respond within 30 days.
            </p>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. International Transfers</h2>
            <p>
              DuckSAT is operated from the United States. If you access the Service from outside the US,
              your data will be transferred to and processed in the United States where data protection laws
              may differ from those in your country.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will update the effective date at the
              top of the page and, for material changes, notify you via email (if you have one on file) or
              via a notice on the site.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              For privacy-related questions or requests, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center text-sm text-gray-500 space-x-4">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
          <Link href="/cookies" className="hover:text-indigo-600 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
