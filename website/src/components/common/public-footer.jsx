import { Link } from 'react-router-dom'
import { Logo } from '@/components/common/logo'

export function PublicFooter() {

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
  }

  return (
    <footer className="public-footer border-t border-slate-200 bg-white dark:border-border dark:bg-card">

      {/* Main Footer */}
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.2fr_1fr_1fr_1fr] lg:px-8">

        {/* Brand */}
        <div className="space-y-4">
          <Logo />

          <p className="max-w-sm text-sm leading-6 text-slate-500">
            Connecting customers with trusted service providers through
            transparency, verification, and a simple booking experience.
          </p>
        </div>


        {/* Customers */}
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            For Customers
          </h5>

          <div className="space-y-2 text-sm text-slate-500">

            {/* Find Services */}
            <Link
              to="/services"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Find Services
            </Link>

            {/* Browse Categories */}
            <Link
              to="/categories"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Browse Categories
            </Link>

            {/* My Bookings */}
            <Link
              to="/customer/bookings"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              My Bookings
            </Link>

            {/* Search */}
            <Link
              to="/search"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Search Services
            </Link>

          </div>
        </div>


        {/* Providers */}
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            For Providers
          </h5>

          <div className="space-y-2 text-sm text-slate-500">

            {/* Become a Provider */}
            <Link
              to="/register"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Become a Provider
            </Link>

            {/* Browse Providers */}
            <Link
              to="/providers"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Browse Providers
            </Link>

            {/* Provider Dashboard */}
            <Link
              to="/provider"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Provider Dashboard
            </Link>

          </div>
        </div>


        {/* Company */}
        <div>
          <h5 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Company
          </h5>

          <div className="space-y-2 text-sm text-slate-500">

            {/* About SevaLink */}
            <Link
              to="/"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              About SevaLink
            </Link>

            {/* Sign In */}
            <Link
              to="/login"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Sign In
            </Link>

            {/* Register */}
            <Link
              to="/register"
              onClick={scrollToTop}
              className="block transition hover:text-blue-700"
            >
              Create Account
            </Link>

          </div>
        </div>

      </div>


      {/* Bottom Footer */}
      <div className="border-t border-slate-200 dark:border-border">

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between lg:px-8">

          <p>
            © 2026 SevaLink. Connecting people with trusted services.
          </p>

          <div className="flex flex-wrap items-center gap-5">

            <span>
              Language:
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {" "}English IN
              </span>
            </span>

            <span>
              Currency:
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {" "}INR
              </span>
            </span>

          </div>

        </div>

      </div>

    </footer>
  )
}