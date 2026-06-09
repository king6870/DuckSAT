import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-white/40 backdrop-blur-sm py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} DuckSAT. SAT&reg; is a trademark of the College Board, which is not affiliated with DuckSAT.</p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy</Link>
          <Link href="/cookies" className="hover:text-indigo-600 transition-colors">Cookies</Link>
        </div>
      </div>
    </footer>
  )
}
