import { Bell, CircleUser } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button' 
import { supabase } from '@/lib/supabase'
import { Logo } from './logo'
import { useNotificationsQuery } from '@/hooks/use-queries'
import { useRealtimeNotifications } from '@/hooks/use-realtime'
import { selectProfile } from '@/store/authSlice'

export function PortalTopbar({ title, nav = [] }) {
  const profile = useSelector(selectProfile)
  const notifications = useNotificationsQuery(nav.length ? profile?.id : null)
  const unreadCount = (notifications.data || []).filter((notification) => !notification.is_read).length

  useRealtimeNotifications(nav.length ? profile?.id : null)

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur lg:px-6">
      <div className="flex items-center gap-6 sm:w-auto">
        <Logo />
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      {nav.length > 0 && (
        <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto lg:order-none lg:w-auto">
          {nav.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path.split('/').length <= 2}
                className={({ isActive }) =>
                  `inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                    isActive ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`
                }
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      )}
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <ThemeToggle />
        {nav.length > 0 && (
          <>
            <NavLink
              to="/customer/notifications"
              className={({ isActive }) =>
                `relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted ${
                  isActive ? 'text-primary ring-2 ring-primary/20' : 'text-foreground'
                }`
              }
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/customer/profile"
              className={({ isActive }) =>
                `inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted ${
                  isActive ? 'text-primary ring-2 ring-primary/20' : 'text-foreground'
                }`
              }
              aria-label="Profile"
            >
              <CircleUser className="h-5 w-5" />
            </NavLink>
          </>
        )}
        {!nav.length && (
          <Button variant="outline" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
        )}
        {!nav.length && (
          <Button onClick={() => logout()}>
            Logout
          </Button>
        )}
      </div>
    </div>
  )
}
