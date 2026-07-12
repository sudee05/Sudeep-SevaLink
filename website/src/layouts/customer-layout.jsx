import { Outlet } from 'react-router-dom'
import { PortalSidebar } from '@/components/common/portal-sidebar'
import { PortalTopbar } from '@/components/common/portal-topbar'
import { customerNav } from '@/routes/nav-data'

export function CustomerLayout() {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Customer Portal" nav={customerNav} />
      <section className="flex min-h-screen flex-1 flex-col">
        <PortalTopbar title="Customer Dashboard" />
        <div className="page-enter flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
