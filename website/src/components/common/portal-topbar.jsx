import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CircleUser, Clock, ShieldCheck, Wrench, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Logo } from './logo'
import { useAdminPendingItemsQuery, useNotificationsQuery } from '@/hooks/use-queries'
import { useRealtimeNotifications } from '@/hooks/use-realtime'
import { selectProfile } from '@/store/authSlice'
import { formatDate } from '@/utils/format'

// ── Admin notification drawer ──────────────────────────────────

function AdminNotificationDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const { data, isLoading } = useAdminPendingItemsQuery()

  const pendingProviders = data?.pendingProviders || []
  const pendingServiceRequests = data?.pendingServiceRequests || []
  const totalCount = pendingProviders.length + pendingServiceRequests.length

  function go(path) {
    onClose()
    navigate(path)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold text-foreground">Notifications</h2>
                <p className="text-xs text-muted-foreground">
                  {totalCount > 0 ? `${totalCount} item${totalCount > 1 ? 's' : ''} need attention` : 'All caught up!'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-1.5 transition hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                  ))}
                </div>
              ) : totalCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">All caught up!</p>
                  <p className="mt-1 text-sm text-muted-foreground">No pending items right now.</p>
                </div>
              ) : (
                <>
                  {/* Pending Providers */}
                  {pendingProviders.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Provider Registrations
                        <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {pendingProviders.length}
                        </span>
                      </p>
                      {pendingProviders.map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => go('/sevalink-admin/providers')}
                          className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {provider.full_name || 'Unknown Provider'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {provider.phone || 'No phone on file'}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDate(provider.created_at)}
                            </p>
                          </div>
                          <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Pending Service Requests */}
                  {pendingServiceRequests.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Wrench className="h-3.5 w-3.5" />
                        Service Requests
                        <span className="ml-auto rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                          {pendingServiceRequests.length}
                        </span>
                      </p>
                      {pendingServiceRequests.map((req) => (
                        <button
                          key={req.id}
                          onClick={() => go('/sevalink-admin/services')}
                          className="flex w-full items-start gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-amber-400/40 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 active:scale-[0.98]"
                        >
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <Wrench className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {req.service_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {req.providers?.business_name || 'A provider'}
                              {req.categories?.name && (
                                <> &nbsp;·&nbsp; {req.categories.name}</>
                              )}
                            </p>
                            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {formatDate(req.created_at)}
                            </p>
                          </div>
                          <span className="ml-auto shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Pending
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-5 py-3">
              <p className="text-center text-xs text-muted-foreground">
                Click a card to go to the relevant management page
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Portal Topbar ──────────────────────────────────────────────

export function PortalTopbar({ title, nav = [], notificationPath, notificationCount }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const profile = useSelector(selectProfile)
  const notificationUserId = nav.length || notificationPath ? profile?.id : null
  const notifications = useNotificationsQuery(notificationUserId)
  const isAdminDrawer = notificationCount !== undefined

  // Admin uses pending count; others count unread from notifications table
  const unreadCount = isAdminDrawer
    ? notificationCount
    : (notifications.data || []).filter((n) => !n.is_read).length

  useRealtimeNotifications(notificationUserId)

  async function logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  return (
    <>
      {/* Admin drawer */}
      {isAdminDrawer && (
        <AdminNotificationDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}

      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur lg:px-6">
        <div className="flex items-center gap-6 sm:w-auto">
          <div>
            <Logo title={title} />
          </div>
          {nav.length > 0 && (
            <nav className="order-3 flex w-full items-center gap-1 overflow-x-auto lg:order-0 lg:w-auto">
              {nav.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path.split('/').length <= 2}
                    className={({ isActive }) =>
                      `inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

          {/* Customer nav bell */}
          {nav.length > 0 && (
            <>
              <NavLink
                to="/customer/notifications"
                className={({ isActive }) =>
                  `relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted ${isActive ? 'text-primary ring-2 ring-primary/20' : 'text-foreground'
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
                  `inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted ${isActive ? 'text-primary ring-2 ring-primary/20' : 'text-foreground'
                  }`
                }
                aria-label="Profile"
              >
                <CircleUser className="h-5 w-5" />
              </NavLink>
            </>
          )}

          {/* Admin / provider bell */}
          {!nav.length && (
            isAdminDrawer ? (
              <button
                type="button"
                onClick={() => setDrawerOpen((o) => !o)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted text-foreground"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            ) : notificationPath ? (
              <NavLink
                to={notificationPath}
                className={({ isActive }) =>
                  `relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition hover:bg-muted ${isActive ? 'text-primary ring-2 ring-primary/20' : 'text-foreground'
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
            ) : (
              <Button variant="outline" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
            )
          )}

          {!nav.length && (
            <Button onClick={() => logout()}>
              Logout
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
