# SevaLink — Project Memory
> Last updated: 2026-07-15

---

## What Is This Project

SevaLink is a home-services marketplace (think Urban Company) built for India. It connects three user types:
- **Customer** — browses and books services
- **Provider** — receives bookings, manages business profile
- **Admin** — controls the platform (approve/reject providers, manage services)

Stack: React + Vite, Tailwind CSS, React Router v6, React Query, Supabase (auth + DB + storage).

---

## Folder Structure (inside `website/src/`)

```
App.jsx                        # Root: wraps QueryClientProvider + ThemeProvider + AppRouter
routes/
  app-router.jsx               # All routes defined here (public, auth, customer, provider, admin)
  nav-data.js                  # Sidebar nav items per portal
layouts/
  public-layout.jsx
  auth-layout.jsx
  customer-layout.jsx
  provider-layout.jsx          # ⚠️ Large file (14 KB) — contains provider onboarding wizard
  admin-layout.jsx
pages/
  public/public-pages.jsx      # Landing, Services, Categories, Providers, Search, ServiceDetails, ProviderDetails
  auth/auth-pages.jsx          # Login/Register/ForgotPwd/OTP for all 3 roles + provider status pages
  customer/customer-pages.jsx  # Dashboard, Bookings, Wishlist, Notifications, Invoices, Profile, Settings, Booking flow
  provider/provider-pages.jsx  # Dashboard, Bookings, Services, Vehicles, Packages, Calendar, Analytics, Payments, Reviews, Profile, Settings
  admin/admin-pages.jsx        # Dashboard, Reports, Services, Bookings, Providers, generic AdminSectionPage
components/
  common/
    auth-listener.jsx          # Listens to Supabase auth state changes
    data-table.jsx             # Reusable table with columns config + rows array
    location-selector.jsx      # 3-column State / District / City selector (see known bugs section)
    logo.jsx
    portal-sidebar.jsx         # Sidebar for customer/provider/admin portals
    portal-topbar.jsx          # Topbar with user menu + theme toggle
    protected-route.jsx        # Role-based route guard using Supabase session
    provider-card.jsx          # Public-facing provider listing card
    public-footer.jsx
    public-navbar.jsx
    section-header.jsx         # Page title + subtitle + optional action button
    service-card.jsx
    stat-card.jsx              # Dashboard KPI card
    theme-toggle.jsx
  ui/
    badge.jsx, button.jsx, card.jsx, empty-state.jsx, error-state.jsx
    input.jsx, loading-grid.jsx, rating.jsx, select.jsx, skeleton.jsx, textarea.jsx
  charts/
    revenue-booking-chart.jsx  # RevenueAreaChart, BookingBarChart (Recharts)
hooks/
  use-queries.js               # React Query hooks: useBookingsQuery, etc.
  use-mock-queries.js          # Mock data hooks for dev
  use-toast.js
contexts/
  theme-provider.jsx           # Dark/light mode context
lib/
  supabase.js                  # Supabase client (createClient)
utils/
  format.js                    # formatCurrency, formatDate helpers
  location-data.js             # getStates, getDistricts, getCities, hasNoDistricts, buildLocation
```

---

## Routing Overview

| Path | Portal | Layout | Auth Required |
|---|---|---|---|
| `/` | Public | PublicLayout | No |
| `/services`, `/categories`, `/providers`, `/provider/:id`, `/service/:id`, `/search` | Public | PublicLayout | No |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/otp`, `/verify-email` | Auth | AuthLayout | No |
| `/provider/login`, `/provider/register`, `/provider/forgot-password` | Auth | AuthLayout | No |
| `/provider/application-submitted`, `/provider/pending`, `/provider/rejected`, `/provider/approved` | Auth | AuthLayout | No |
| `/sevalink-admin/login`, `/sevalink-admin/forgot-password` | Auth | AuthLayout | No |
| `/customer/*` | Customer | CustomerLayout | `customer` or `admin` role |
| `/provider/*` | Provider | ProviderLayout | `provider` or `admin` role |
| `/sevalink-admin/*` | Admin | AdminLayout | `admin` role only |

---

## Database Schema (Supabase / PostgreSQL)

### Tables

| Table | Key Columns | Notes |
|---|---|---|
| `profiles` | `id` (= auth.users.id), `full_name`, `phone`, `avatar_url`, `role`, `approval_status` | Auto-created on auth signup via trigger |
| `categories` | `id`, `name`, `icon`, `color`, `services_count` | Admin-only write |
| `providers` | `id`, `user_id` → profiles, `business_name`, `category`, `about`, `image_url`, `rating`, `total_jobs`, `experience`, `verified`, `certificates[]`, `location`, `status` | status: pending/approved/rejected |
| `services` | `id`, `name`, `description` | Master catalog, admin-only write |
| `provider_services` | `provider_id`, `service_id` | Join table — what services a provider offers |
| `service_requests` | `provider_id`, `name`, `description`, `status` | Provider requests new service type |
| `bookings` | `id`, `booking_code`, `service_id`, `customer_id`, `provider_id`, `service_title`, `provider_name`, `customer_name`, `scheduled_date`, `status`, `amount`, `address`, `notes` | status: pending/confirmed/in_progress/completed/cancelled |
| `reviews` | `id`, `service_id`, `customer_id`, `rating`, `comment` | |
| `documents` | `id`, `provider_id`, `name`, `file_url`, `status` | Provider verification docs |
| `notifications` | `id`, `user_id`, `title`, `message`, `read` | |

### Roles (in `profiles.role`)
- `customer` (default)
- `provider`
- `admin`

### Auth trigger
On signup, `handle_new_user()` trigger auto-inserts into `profiles` using `raw_user_meta_data.full_name` and `raw_user_meta_data.role`.

---

## Provider Onboarding Wizard

Lives inside `provider-layout.jsx`. It's a 3-step wizard shown to providers who have logged in but haven't set up their profile yet:

- **Step 1** — Basic Info: business name + location (uses `LocationSelector`)
- **Step 2** — Services: select from catalog
- **Step 3** — About: description, experience, submit

On submit it writes to the `providers` table and sets status to `pending` (awaiting admin approval).

---

## Location Selector — Known Issue & Fix

### The data file
`website/Country+State+District-City-Data.js` — 3.4 MB, exports `stateObject`.

### Problem (FIXED 2026-07-15)
India's data in this file is **flat** (2 levels), not nested (3 levels):
```js
// Actual format in file:
"India": { "Karnataka": ["Bengaluru", "Mysuru", ...] }

// What the code originally assumed:
"India": { "Karnataka": { "Bengaluru District": ["Bengaluru", ...] } }
```
Calling `Object.keys(["Bengaluru", "Mysuru"])` returned array indices `0, 1, 2...` — those were showing as district names in the dropdown.

### Fix applied
**`src/utils/location-data.js`**
- Added `isFlatState(state)` — detects when `INDIA[state]` is an Array
- `getDistricts(state)` returns `[]` for flat states
- `getCities(state, district)` returns the flat array directly for flat states (district param ignored)
- Added `hasNoDistricts(state)` export for UI to query

**`src/components/common/location-selector.jsx`**
- In **flat mode** (Indian states): the flat city list is used as the **District dropdown** options
- The **City field** becomes a **free-text `<input>`** (user types their locality/area manually)
- Always renders 3 columns (State | District | City text input)
- City input is disabled until a district is selected

---

## UI Component Conventions

- All UI primitives are in `src/components/ui/`
- Use `<Card>`, `<Button>`, `<Input>`, `<Select>`, `<Badge>`, `<Textarea>` from there — never raw HTML equivalents
- `<DataTable columns={[...]} rows={[...]} />` for any tabular data
- `<SectionHeader title="" subtitle="" action={<Button/>} />` for page headers
- `<StatCard label="" value="" delta="" icon={LucideIcon} />` for KPI cards
- Icons: Lucide React only
- Animations: Framer Motion (`motion.div` with `fade` config = `{ initial: {opacity:0,y:10}, animate:{opacity:1,y:0}, transition:{duration:0.3} }`)

---

## Styling

- Tailwind CSS only — no inline styles, no custom CSS files except globals
- Dark mode via CSS variables in `App.css` / `index.css` — `ThemeProvider` in contexts
- Design tokens: `bg-card`, `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary`, `ring-primary/20`, etc.
- Rounded: `rounded-xl` standard, `rounded-lg` for inner elements
- Consistent padding: `px-4 py-3` for inputs, `p-4` for cards

---

## Known TODOs / Stub Modules

These pages exist but show placeholder content (no real data/API wiring):
- `ProviderVehiclesPage` — hardcoded mock vehicles
- `ProviderPackagesPage`, `ProviderCalendarPage`, `ProviderPaymentsPage`, `ProviderReviewsPage` — ModuleCard stub
- `ProviderProfilePage` — hardcoded default values (not pulling from Supabase yet)
- `ProviderDashboardPage` — all stats are hardcoded mock values
- Most Customer pages — booking flow, invoices, wishlist are UI-only stubs
- Admin analytics/reports — mock chart data only

---

## Development

```bash
cd website
npm run dev   # Vite dev server, runs on localhost:5173
```

Supabase credentials are in `website/.env` (not committed).

---

## Rules / Conventions (from rules.md)

- Functional components only, React Hooks
- Max 250 lines per file — split large pages into smaller components
- Tailwind CSS only
- PascalCase components, camelCase functions, kebab-case folders, UPPER_CASE constants
- React Query for server state, Context API for global state — no Redux
- Lucide React for icons
- Never duplicate code — create reusable components
- Meaningful git commits, feature branches, no direct commits to main
