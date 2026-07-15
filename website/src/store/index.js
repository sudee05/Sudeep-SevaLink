import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import adminReducer from './adminSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    admin: adminReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Supabase user objects contain non-serializable values (e.g. dates)
        ignoredActions: [
          'auth/initialize/fulfilled',
          'auth/signIn/fulfilled',
          'auth/signUp/fulfilled',
        ],
        ignoredPaths: ['auth.user'],
      },
    }),
})
