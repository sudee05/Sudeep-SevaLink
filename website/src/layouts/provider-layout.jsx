import { Outlet } from 'react-router-dom'
import { PortalSidebar } from '@/components/common/portal-sidebar'
import { PortalTopbar } from '@/components/common/portal-topbar'
import { providerNav } from '@/routes/nav-data'

export function ProviderLayout() {
  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Provider Studio" nav={providerNav} />
      <section className="flex min-h-screen flex-1 flex-col">
        <PortalTopbar title="Service Provider Dashboard" />
        <div className="page-enter flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
