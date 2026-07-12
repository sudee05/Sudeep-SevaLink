import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/common/logo'

export function AuthLayout() {
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,.16),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,.16),transparent_35%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-border bg-card/90 p-6 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Outlet />
      </div>
    </div>
  )
}
