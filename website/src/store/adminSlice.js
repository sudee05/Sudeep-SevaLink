import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import {
  getAdminComplaints,
  getAdminServices,
  getAdminUsers,
  getAllProviders,
  getBookings,
  createService,
  updateService,
  deleteService,
} from '@/services/supabaseApi'

const fetchers = {
  users: getAdminUsers,
  providers: getAllProviders,
  services: getAdminServices,
  bookings: getBookings,
  complaints: getAdminComplaints,
}

// ── Fetch (Read) ──────────────────────────────────────────────
export const fetchAdminSection = createAsyncThunk(
  'admin/fetchSection',
  async (section, { rejectWithValue }) => {
    try {
      const fetchSection = fetchers[section]
      if (!fetchSection) return { section, rows: [] }

      const rows = await fetchSection()
      return { section, rows: rows || [] }
    } catch (error) {
      return rejectWithValue({
        section,
        message: error.message || `Could not load ${section}`,
      })
    }
  }
)

// ── Create ────────────────────────────────────────────────────
export const createAdminRow = createAsyncThunk(
  'admin/createRow',
  async ({ section, payload }, { rejectWithValue }) => {
    try {
      const creators = { services: createService }
      const fn = creators[section]
      if (!fn) throw new Error(`No creator for section: ${section}`)
      const row = await fn(payload)
      return { section, row }
    } catch (error) {
      return rejectWithValue({ section, message: error.message })
    }
  }
)

// ── Update ────────────────────────────────────────────────────
export const updateAdminRow = createAsyncThunk(
  'admin/updateRow',
  async ({ section, id, payload }, { rejectWithValue }) => {
    try {
      const updaters = { services: updateService }
      const fn = updaters[section]
      if (!fn) throw new Error(`No updater for section: ${section}`)
      const row = await fn(id, payload)
      return { section, id, row }
    } catch (error) {
      return rejectWithValue({ section, message: error.message })
    }
  }
)

// ── Delete ────────────────────────────────────────────────────
export const deleteAdminRow = createAsyncThunk(
  'admin/deleteRow',
  async ({ section, id }, { rejectWithValue }) => {
    try {
      const deleters = { services: deleteService }
      const fn = deleters[section]
      if (!fn) throw new Error(`No deleter for section: ${section}`)
      await fn(id)
      return { section, id }
    } catch (error) {
      return rejectWithValue({ section, message: error.message })
    }
  }
)

const adminSlice = createSlice({
  name: 'admin',
  initialState: {
    sections: {},
  },
  reducers: {
    resetSection(state, action) {
      const section = action.payload
      if (state.sections[section]) {
        state.sections[section].status = 'idle'
      }
    },
  },

  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchAdminSection.pending, (state, action) => {
        const section = action.meta.arg
        state.sections[section] = {
          rows: state.sections[section]?.rows || [],
          status: 'loading',
          error: null,
        }
      })
      .addCase(fetchAdminSection.fulfilled, (state, action) => {
        state.sections[action.payload.section] = {
          rows: action.payload.rows,
          status: 'succeeded',
          error: null,
        }
      })
      .addCase(fetchAdminSection.rejected, (state, action) => {
        const section = action.payload?.section || action.meta.arg
        state.sections[section] = {
          rows: state.sections[section]?.rows || [],
          status: 'failed',
          error: action.payload?.message || action.error.message,
        }
      })

    // Create
    builder
      .addCase(createAdminRow.fulfilled, (state, action) => {
        const { section, row } = action.payload
        if (!state.sections[section]) state.sections[section] = { rows: [], status: 'succeeded', error: null }
        state.sections[section].rows.unshift(row)
      })

    // Update
    builder
      .addCase(updateAdminRow.fulfilled, (state, action) => {
        const { section, id, row } = action.payload
        const sec = state.sections[section]
        if (sec) {
          const idx = sec.rows.findIndex((r) => r.id === id)
          if (idx !== -1) sec.rows[idx] = row
        }
      })

    // Delete
    builder
      .addCase(deleteAdminRow.fulfilled, (state, action) => {
        const { section, id } = action.payload
        const sec = state.sections[section]
        if (sec) {
          sec.rows = sec.rows.filter((r) => r.id !== id)
        }
      })
  },
})

export const { resetSection } = adminSlice.actions
export default adminSlice.reducer


// ── Selectors ─────────────────────────────────────────────────
// Cache of memoized selectors per section — avoids creating a new object
// reference on every call which would trigger unnecessary re-renders.
const selectorCache = {}

export function selectAdminSection(section) {
  if (!selectorCache[section]) {
    selectorCache[section] = createSelector(
      (state) => state.admin.sections[section],
      (sectionState) => sectionState || { rows: [], status: 'idle', error: null }
    )
  }
  return selectorCache[section]
}
