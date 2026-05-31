import Link from 'next/link'

type EmailWorkspaceSection = 'create' | 'triggers' | 'operations' | 'overview'

interface EmailWorkspaceNavProps {
  active?: EmailWorkspaceSection
  title?: string
  description?: string
}

const NAV_ITEMS: Array<{
  key: EmailWorkspaceSection
  href: string
  step: string
  label: string
  description: string
  tone: string
  activeTone: string
}> = [
  {
    key: 'create',
    href: '/admin/email-create',
    step: '01',
    label: 'Create Email',
    description: 'Build reusable email templates, preview them, and manage coupon codes in one place.',
    tone: 'border-cyan-200 bg-cyan-50/80 hover:border-cyan-300 hover:bg-cyan-50',
    activeTone: 'border-cyan-500 bg-cyan-500 text-white shadow-[0_20px_60px_rgba(6,182,212,0.25)]',
  },
  {
    key: 'triggers',
    href: '/admin/email-automations',
    step: '02',
    label: 'Assign Triggers',
    description: 'Attach saved emails to events like finishing a practice test or hitting a score threshold.',
    tone: 'border-amber-200 bg-amber-50/80 hover:border-amber-300 hover:bg-amber-50',
    activeTone: 'border-amber-500 bg-amber-500 text-slate-950 shadow-[0_20px_60px_rgba(245,158,11,0.28)]',
  },
  {
    key: 'operations',
    href: '/admin/email-campaigns',
    step: '03',
    label: 'Send + Track',
    description: 'Send to audiences, watch recent outbound activity, and keep your inbound inbox visible.',
    tone: 'border-emerald-200 bg-emerald-50/80 hover:border-emerald-300 hover:bg-emerald-50',
    activeTone: 'border-emerald-500 bg-emerald-500 text-white shadow-[0_20px_60px_rgba(16,185,129,0.25)]',
  },
  {
    key: 'overview',
    href: '/admin/email-overview',
    step: '04',
    label: 'Email Overview',
    description: 'See templates, attached triggers, send counts, recipients, and recent errors in one place.',
    tone: 'border-violet-200 bg-violet-50/80 hover:border-violet-300 hover:bg-violet-50',
    activeTone: 'border-violet-500 bg-violet-500 text-white shadow-[0_20px_60px_rgba(139,92,246,0.25)]',
  },
]

export default function EmailWorkspaceNav({
  active,
  title = 'Email Workspace',
  description = 'Use one clear page for each job instead of mixing creation, trigger assignment, and sending into the same screen.',
}: EmailWorkspaceNavProps) {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Admin Email Workspace</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">{title}</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">{description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Back to dashboard
          </Link>
          <Link href="/admin/inbound-emails" className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
            Open full inbox
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-[26px] border p-5 transition ${isActive ? item.activeTone : item.tone}`}
            >
              <div className={`text-xs font-bold uppercase tracking-[0.24em] ${isActive ? 'text-white/75' : 'text-slate-500'}`}>
                Step {item.step}
              </div>
              <div className="mt-3 text-2xl font-black tracking-tight">{item.label}</div>
              <p className={`mt-3 text-sm leading-6 ${isActive ? 'text-white/85' : 'text-slate-600'}`}>{item.description}</p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}