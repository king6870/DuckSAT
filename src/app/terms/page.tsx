import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service | DuckSAT',
  description: 'DuckSAT Terms of Service — please read before using our platform.',
}

const EFFECTIVE_DATE = 'June 9, 2026'
const CONTACT_EMAIL = 'support@ducksat.com'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
            <span className="text-sm font-semibold text-indigo-700">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
            <span className="text-gray-300">|</span>
            <Link href="/cookies" className="text-indigo-600 hover:underline">Cookie Policy</Link>
          </div>
        </div>

        {/* SAT Trademark Notice — prominent, before body */}
        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-5">
          <p className="text-sm text-amber-800 leading-relaxed">
            <strong>Trademark Notice:</strong> SAT® is a trademark registered by the College Board, which is not affiliated with,
            and does not endorse, DuckSAT or any of its products or services. All College Board trademarks are the property of
            the College Board. DuckSAT is an independent test-preparation service and has no relationship with the College Board.
          </p>
        </div>

        {/* Body */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 px-8 py-10 sm:px-12 sm:py-14 space-y-10 text-gray-700 leading-relaxed">

          {/* 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DuckSAT (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service
              (&ldquo;Terms&rdquo;). If you do not agree to all of these Terms, do not use the Service. These Terms
              apply to all visitors, users, and others who access the Service.
            </p>
            <p className="mt-3">
              We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance
              of the revised Terms. We will indicate the effective date at the top of this page.
            </p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              DuckSAT is an online SAT® test-preparation platform that provides practice questions, full-length
              practice tests, topic drills, progress analytics, and AI-assisted tutoring. The platform is operated
              by DuckSAT (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
            </p>
            <p className="mt-3">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time without
              prior notice.
            </p>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Accounts</h2>
            <p>
              You may create an account using a username and password (&ldquo;Credentials Account&rdquo;) or by
              authenticating through Google OAuth. You are responsible for maintaining the confidentiality of your
              login credentials and for all activities that occur under your account.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
              <li>You must be at least 13 years old to use the Service.</li>
              <li>You may not create accounts for others or transfer your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>We may suspend or terminate accounts that violate these Terms.</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Free and Premium Plans</h2>
            <p>
              DuckSAT offers a free tier with limited access to practice tests and drills. A paid subscription
              (&ldquo;Premium&rdquo;) unlocks unlimited practice tests, unlimited drills, and additional features.
              Plan details and limits are described on our{' '}
              <Link href="/pricing" className="text-indigo-600 hover:underline">Pricing page</Link>.
            </p>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Subscriptions and Billing</h2>
            <p>
              Premium subscriptions are billed on a recurring monthly or annual basis through Stripe. By subscribing,
              you authorize us to charge your payment method on the applicable billing cycle.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
              <li>All prices are in US dollars unless otherwise stated.</li>
              <li>Taxes may apply depending on your jurisdiction.</li>
              <li>Subscription fees are charged at the start of each billing period.</li>
              <li>We do not store your full card details; they are handled securely by Stripe.</li>
              <li>
                Failed payments may result in immediate suspension of Premium access until payment is resolved.
              </li>
            </ul>
          </section>

          {/* 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Cancellation and Refunds</h2>
            <p>
              You may cancel your subscription at any time from your account settings or by contacting us. Upon
              cancellation:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
              <li>Your Premium access continues until the end of the current paid billing period.</li>
              <li>No further charges will be made after the current period ends.</li>
              <li>
                We do not offer prorated refunds for mid-cycle cancellations unless required by applicable law.
              </li>
              <li>
                Refund requests for exceptional circumstances may be submitted to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
                within 7 days of a charge.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>
              All content on DuckSAT — including practice questions, explanations, software, graphics, and
              text — is the property of DuckSAT or its licensors and is protected by applicable intellectual
              property laws. You may not reproduce, distribute, or create derivative works from any content
              without our prior written consent.
            </p>
            <p className="mt-3">
              Content generated through our AI features remains the property of DuckSAT. You are granted a
              limited, non-exclusive, non-transferable license to use the Service for personal, non-commercial
              test-preparation purposes only.
            </p>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Prohibited Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm">
              <li>Share, scrape, or redistribute any practice questions or content from the Service.</li>
              <li>Attempt to circumvent any access restrictions or copy-protection measures.</li>
              <li>Use the Service for any commercial purpose without written permission.</li>
              <li>Impersonate any person or entity, or falsely state your affiliation.</li>
              <li>Use automated tools, bots, or scrapers to access the Service.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Post or transmit any unlawful, offensive, or harmful content.</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Third-Party Services</h2>
            <p>
              DuckSAT integrates with third-party services including Stripe (payment processing), Google
              (authentication), and Resend (email delivery). Your use of these services is also governed by
              their respective terms and privacy policies. We are not responsible for the practices of these
              third parties.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY
              KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL
              BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
            </p>
            <p className="mt-3">
              DuckSAT makes no guarantee that use of the Service will result in any particular SAT® score or
              academic outcome.
            </p>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Limitation of Liability</h2>
            <p>
              TO THE FULLEST EXTENT PERMITTED BY LAW, DUCKSAT AND ITS OPERATORS, EMPLOYEES, AND AGENTS SHALL
              NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING
              OUT OF OR RELATED TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p className="mt-3">
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE
              SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $50,
              WHICHEVER IS GREATER.
            </p>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless DuckSAT and its operators from any claims, damages,
              losses, liabilities, and expenses (including reasonable attorneys&apos; fees) arising out of your
              use of the Service, your violation of these Terms, or your violation of any third-party rights.
            </p>
          </section>

          {/* 13 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>, which is
              incorporated into these Terms by reference. Please review it to understand our data practices.
            </p>
          </section>

          {/* 14 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">14. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions. Any disputes arising under these Terms shall be
              resolved through binding arbitration or in the courts of competent jurisdiction.
            </p>
          </section>

          {/* 15 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">15. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-8 text-center text-sm text-gray-500 space-x-4">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          <Link href="/cookies" className="hover:text-indigo-600 transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </div>
  )
}
