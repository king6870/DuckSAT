import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy | DuckSAT',
  description: 'How DuckSAT uses cookies and similar technologies.',
}

const EFFECTIVE_DATE = 'June 9, 2026'
const CONTACT_EMAIL = 'support@ducksat.com'

const cookies = [
  {
    category: 'Strictly Necessary',
    required: true,
    description: 'These cookies are essential for the site to function. They cannot be disabled.',
    items: [
      {
        name: '__Secure-next-auth.session-token',
        purpose: 'Keeps you logged in during your session.',
        duration: '30 days',
        provider: 'DuckSAT',
      },
      {
        name: '__Host-next-auth.csrf-token',
        purpose: 'Prevents cross-site request forgery attacks.',
        duration: 'Session',
        provider: 'DuckSAT',
      },
      {
        name: 'ARRAffinity / ARRAffinitySameSite',
        purpose: 'Ensures requests are routed to the same server (Azure load balancer).',
        duration: 'Session',
        provider: 'Microsoft Azure',
      },
      {
        name: 'ducksat-cookie-consent',
        purpose: 'Stores your cookie consent preference.',
        duration: '1 year',
        provider: 'DuckSAT',
      },
    ],
  },
  {
    category: 'Analytics & Advertising',
    required: false,
    description:
      'These cookies help us understand how users find and use our site, and allow us to show relevant ads. They are only loaded if you accept.',
    items: [
      {
        name: '_fbp, fr',
        purpose: 'Meta (Facebook) Pixel — tracks page views and conversion events for advertising.',
        duration: '90 days',
        provider: 'Meta Platforms, Inc.',
      },
    ],
  },
  {
    category: 'Preferences',
    required: false,
    description:
      'These are stored in your browser\'s localStorage (not transmitted to our servers) to remember your preferences.',
    items: [
      {
        name: 'ducksat-theme',
        purpose: 'Remembers your light/dark theme preference.',
        duration: 'Persistent (localStorage)',
        provider: 'DuckSAT',
      },
    ],
  },
]

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm border border-indigo-200 mb-6">
            <span className="text-sm font-semibold text-indigo-700">Legal</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">Cookie Policy</h1>
          <p className="text-gray-500 text-sm">Effective date: {EFFECTIVE_DATE}</p>
          <div className="mt-4 flex justify-center gap-4 text-sm">
            <Link href="/terms" className="text-indigo-600 hover:underline">Terms of Service</Link>
            <span className="text-gray-300">|</span>
            <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-indigo-100 px-8 py-10 sm:px-12 sm:py-14 space-y-10 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">What Are Cookies?</h2>
            <p>
              Cookies are small text files placed on your device by websites you visit. They are widely used
              to make websites work efficiently, to remember your preferences, and to provide information to
              site owners. We also use localStorage (a browser storage mechanism) to save preferences on your
              device without transmitting them to our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">How We Use Cookies</h2>
            <p>
              DuckSAT uses cookies and similar technologies for three purposes: keeping you authenticated,
              understanding site usage, and remembering your preferences. The table below lists every cookie
              or storage item we use.
            </p>
          </section>

          {/* Cookie tables */}
          {cookies.map((cat) => (
            <section key={cat.category}>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">{cat.category}</h2>
                {cat.required ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Always on</span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Optional</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">{cat.description}</p>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-semibold">Cookie / Key</th>
                      <th className="px-4 py-3 font-semibold">Purpose</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Provider</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cat.items.map((item) => (
                      <tr key={item.name} className="bg-white">
                        <td className="px-4 py-3 font-mono text-xs text-gray-800 whitespace-nowrap">{item.name}</td>
                        <td className="px-4 py-3 text-gray-600">{item.purpose}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.duration}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{item.provider}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Managing Your Preferences</h2>
            <p>
              When you first visit DuckSAT, a consent banner allows you to accept or decline optional cookies.
              You can change your preference at any time by clearing your browser cookies and revisiting the
              site, or by contacting us.
            </p>
            <p className="mt-3">
              You can also control cookies through your browser settings. Note that disabling strictly
              necessary cookies will prevent you from logging in or using core features of DuckSAT.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Third-Party Cookies</h2>
            <p>
              Meta Platforms, Inc. sets cookies via the Meta Pixel embedded on our site. These cookies are
              governed by{' '}
              <a
                href="https://www.facebook.com/policies/cookies/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                Meta&apos;s Cookie Policy
              </a>
              . If you decline optional cookies, the Meta Pixel will not load.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time. The effective date at the top of the page
              will reflect when it was last updated.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p>
              Questions about our cookie practices? Email us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-600 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

        </div>

        <div className="mt-8 text-center text-sm text-gray-500 space-x-4">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
