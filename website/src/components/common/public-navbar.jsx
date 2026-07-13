import { Menu, User } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'
import { ThemeToggle } from '@/components/common/theme-toggle'

const links = [
  { to: '/services', label: 'Services' },
  { to: '/categories', label: 'Categories' },
  { to: '/providers', label: 'Providers' },
  { to: '/search', label: 'Search' },
]

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-2 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted ${isActive ? 'bg-muted text-primary' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="icon" className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>
          <Link to="/login" className="hidden md:inline-flex">
            <Button variant="outline">
              <User className="h-4 w-4" /> Login
            </Button>
          </Link>
          <Link to="/register" className="hidden md:inline-flex">
            <Button>Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
