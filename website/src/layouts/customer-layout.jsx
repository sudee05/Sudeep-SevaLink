import { Outlet } from 'react-router-dom'
import { PortalTopbar } from '@/components/common/portal-topbar'
import { customerNav } from '@/routes/nav-data'
import { PhoneCall } from 'lucide-react'

export function CustomerLayout() {
  return (
    <div className="min-h-screen">
      <section className="flex min-h-screen flex-1 flex-col">
        <PortalTopbar title="Customer Dashboard" nav={customerNav} />
        <div className="page-enter flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
      <a
        href="tel:+919888844556"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Call customer care">
        <PhoneCall className="h-4 w-4" />
        Customer Care
      </a>
    </div>
  )
}
