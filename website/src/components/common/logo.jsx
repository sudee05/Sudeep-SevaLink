import { Link } from 'react-router-dom'
import sevalinkLogo from '@/assets/sevalink_logo.png'

export function Logo() {
  return (
    <Link to="/" className="brand-logo inline-flex items-center gap-3 text-lg font-bold tracking-tight text-primary">
      <img src={sevalinkLogo} alt="SevaLink" className="h-9 w-9 rounded-xl object-cover" />
      <span className="text-slate-950 dark:text-foreground">SevaLink</span>
    </Link>
  )
}
