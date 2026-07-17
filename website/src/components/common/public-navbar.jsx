import { Menu } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'
import { ThemeToggle } from '@/components/common/theme-toggle'

const links = [
  { to: '/services', label: 'For Customers' },
  { to: '/providers', label: 'For Providers' },
  { to: '/categories', label: 'About Us' },
]

export function PublicNavbar() {
  return (
    <header className="public-nav sticky top-0 z-40 border-b border-slate-200/80 bg-[#f6f8ff]/88 backdrop-blur-xl dark:border-border dark:bg-background/90">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-muted dark:hover:text-foreground ${isActive ? 'bg-white text-slate-950 shadow-sm dark:bg-muted dark:text-foreground' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="icon" className="border-slate-200 bg-white dark:border-border dark:bg-card md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
          <Link to="/register?type=provider" className="hidden md:inline-flex">
            <Button variant="outline" className="rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-50">
              Become a Provider
            </Button>
          </Link>
          <Link to="/login" className="hidden md:inline-flex">
            <Button className="rounded-xl bg-blue-700 text-white hover:bg-blue-800">Sign In</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
