import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { supabase } from '@/lib/supabase'
import { initializeAuth, setAuth, clearAuth } from '@/store/authSlice'

/**
 * AuthListener — initializes auth state on mount and subscribes to
 * Supabase auth changes, dispatching Redux actions accordingly.
 * Place this component once inside the Redux Provider.
 */
export function AuthListener({ children }) {
  const dispatch = useDispatch()

  useEffect(() => {
    // 1. Hydrate session on first load
    dispatch(initializeAuth())

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          dispatch(setAuth({ user: session.user, profile }))
        }

        if (event === 'SIGNED_OUT') {
          dispatch(clearAuth())
        }

        if (event === 'TOKEN_REFRESHED' && session) {
          // Session refreshed — keep user the same, just update user object
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          dispatch(setAuth({ user: session.user, profile }))
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [dispatch])

  return children
}
