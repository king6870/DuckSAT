import EmailWorkspaceNav from '@/components/admin/EmailWorkspaceNav'

export default function AdminEmailWorkspacePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff_0%,#f8fafc_42%,#dbeafe_100%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <EmailWorkspaceNav
          title="Run DuckSAT email from three clean pages"
          description="Create the email first, assign it to a trigger second, and use the send-and-track screen for audience sends plus inbox visibility. Coupon codes now belong with email creation."
        />

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[26px] border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Create Email</div>
            <div className="mt-2 text-lg font-bold text-slate-900">Templates, preview, AI drafting, and coupon setup live together.</div>
          </div>
          <div className="rounded-[26px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Assign Triggers</div>
            <div className="mt-2 text-lg font-bold text-slate-900">Map created emails to events like practice test completion or drill behavior.</div>
          </div>
          <div className="rounded-[26px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Send + Track</div>
            <div className="mt-2 text-lg font-bold text-slate-900">Send to audiences, watch recent deliveries, and keep the inbound inbox visible.</div>
          </div>
          <div className="rounded-[26px] border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5">
            <div className="text-sm font-semibold text-slate-600">Email Overview</div>
            <div className="mt-2 text-lg font-bold text-slate-900">Audit templates, automations, trigger actions, send counts, recipients, and errors from one page.</div>
          </div>
        </section>
      </div>
    </div>
  )
}