import { Outlet } from 'react-router-dom'
import { PublicNavbar } from '@/components/common/public-navbar'
import { PublicFooter } from '@/components/common/public-footer'

export function PublicLayout() {
  return (
    <div className="min-h-screen overflow-hidden">
      <PublicNavbar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 lg:px-8">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  )
}
