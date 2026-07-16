import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/logo'

export function PublicFooter() {
  return (
    <footer className="public-footer border-t border-slate-200 bg-white dark:border-border dark:bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Redefining service excellence through transparency, vetting, and a premium customer and provider experience.
          </p>
        </div>
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">For Customers</h5>
          <div className="space-y-2 text-sm text-slate-500">
            <Link to="/services" className="block hover:text-blue-700">Find Services</Link>
            <Link to="/customer/bookings" className="block hover:text-blue-700">Booking Help</Link>
            <Link to="/search" className="block hover:text-blue-700">Customer Care</Link>
          </div>
        </div>
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">For Providers</h5>
          <div className="space-y-2 text-sm text-slate-500">
            <Link to="/register" className="block hover:text-blue-700">Provider Hub</Link>
            <Link to="/provider" className="block hover:text-blue-700">Success Stories</Link>
            <Link to="/provider/services" className="block hover:text-blue-700">Pro Support</Link>
          </div>
        </div>
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Company</h5>
          <div className="space-y-2 text-sm text-slate-500">
            <Link to="/categories" className="block hover:text-blue-700">Our Mission</Link>
            <Link to="/providers" className="block hover:text-blue-700">Careers</Link>
            <Link to="/login" className="block hover:text-blue-700">Terms & Privacy</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 SevaLink. Premium service ecosystem.</p>
          <div className="flex flex-wrap items-center gap-5">
            <span>Language: <span className="font-semibold text-slate-600">English US</span></span>
            <span>Currency: <span className="font-semibold text-slate-600">USD</span></span>
          </div>
        </div>
      </div>
    </footer>
  )
}
