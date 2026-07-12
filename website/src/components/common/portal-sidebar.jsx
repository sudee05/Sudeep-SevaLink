import { NavLink } from 'react-router-dom'

export function PortalSidebar({ title, nav }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/70 bg-card/80 p-4 lg:block">
      <h3 className="mb-4 px-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <nav className="space-y-1">
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-primary text-white shadow-sm' : 'hover:bg-muted'}`
              }
              end={item.path.split('/').length <= 3}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
