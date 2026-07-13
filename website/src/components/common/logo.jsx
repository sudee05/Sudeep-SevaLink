import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-primary">
      <span className="rounded-xl bg-primary p-2 text-white">
        <Sparkles className="h-4 w-4" />
      </span>
      SevaLink
    </Link>
  )
}
