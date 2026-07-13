import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { supabase } from '@/lib/supabase'

// ── Async Thunks ──────────────────────────────────────────────

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      if (!session) return { user: null, profile: null }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      return { user: session.user, profile }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const signInWithEmail = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return { user: data.user, profile }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const signUpWithEmail = createAsyncThunk(
  'auth/signUp',
  async ({ email, password, fullName, phone, role = 'customer' }, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      })
      if (error) throw error

      // Update the profile with phone if provided
      if (data.user && phone) {
        await supabase
          .from('profiles')
          .update({ phone })
          .eq('id', data.user.id)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()

      return { user: data.user, profile }
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const signOut = createAsyncThunk(
  'auth/signOut',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return null
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      return true
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

export const updatePassword = createAsyncThunk(
  'auth/updatePassword',
  async ({ password }, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      return true
    } catch (err) {
      return rejectWithValue(err.message)
    }
  }
)

// ── Slice ─────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    profile: null,
    loading: true,
    error: null,
  },
  reducers: {
    setAuth(state, action) {
      state.user = action.payload.user
      state.profile = action.payload.profile
      state.loading = false
    },
    clearAuth(state) {
      state.user = null
      state.profile = null
      state.loading = false
      state.error = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    // Initialize
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.loading = true
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.profile = action.payload.profile
        state.loading = false
        state.error = null
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Sign In
    builder
      .addCase(signInWithEmail.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signInWithEmail.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.profile = action.payload.profile
        state.loading = false
        state.error = null
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Sign Up
    builder
      .addCase(signUpWithEmail.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(signUpWithEmail.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.profile = action.payload.profile
        state.loading = false
        state.error = null
      })
      .addCase(signUpWithEmail.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

    // Sign Out
    builder
      .addCase(signOut.fulfilled, (state) => {
        state.user = null
        state.profile = null
        state.loading = false
        state.error = null
      })

    // Reset Password
    builder
      .addCase(resetPassword.rejected, (state, action) => {
        state.error = action.payload
      })

    // Update Password
    builder
      .addCase(updatePassword.rejected, (state, action) => {
        state.error = action.payload
      })
  },
})

export const { setAuth, clearAuth, clearError } = authSlice.actions
export default authSlice.reducer

// ── Selectors ─────────────────────────────────────────────────

export const selectUser = (state) => state.auth.user
export const selectProfile = (state) => state.auth.profile
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError = (state) => state.auth.error
export const selectIsAuthenticated = (state) => Boolean(state.auth.user)
export const selectUserRole = (state) => state.auth.profile?.role || null
export const selectIsCustomer = (state) => state.auth.profile?.role === 'customer'
export const selectIsProvider = (state) => state.auth.profile?.role === 'provider'
export const selectIsAdmin = (state) => state.auth.profile?.role === 'admin'
