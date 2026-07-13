import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectIsAuthenticated, selectAuthLoading, selectUserRole } from '@/store/authSlice'

/**
 * ProtectedRoute — wraps route content and enforces:
 *  1. Authentication (redirects to /login if not signed in)
 *  2. Role check (redirects to / if role doesn't match)
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - content to render if authorized
 * @param {string|string[]} [props.allowedRoles] - role(s) that can access this route
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const loading = useSelector(selectAuthLoading)
  const role = useSelector(selectUserRole)

  // While checking auth state, show a loading indicator
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking authentication…</p>
        </div>
      </div>
    )
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Role check
  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
    if (!roles.includes(role)) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
