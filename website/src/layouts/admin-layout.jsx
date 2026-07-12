import { Outlet } from 'react-router-dom'
import { PortalSidebar } from '@/components/common/portal-sidebar'
import { PortalTopbar } from '@/components/common/portal-topbar'
import { adminNav } from '@/routes/nav-data'

export function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Admin Console" nav={adminNav} />
      <section className="flex min-h-screen flex-1 flex-col">
        <PortalTopbar title="SevaLink Admin" />
        <div className="page-enter flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
