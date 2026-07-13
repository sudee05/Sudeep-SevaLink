# SevaLink Architecture

## Technology Stack

Frontend

- React
- Vite
- Tailwind CSS
- React Router
- React Query
- Shadcn UI

Backend

- Supabase

Database

- PostgreSQL

Authentication

- Supabase Auth

Storage

- Supabase Storage

Future

- React Native
- Razorpay
- Push Notifications

---

# Project Structure

src/

components/

layouts/

pages/

hooks/

contexts/

services/

lib/

routes/

assets/

types/

utils/

---

# User Roles

Customer

↓

Books Services

Provider

↓

Receives Bookings

Admin

↓

Controls Platform

---

# Database Modules

Users

Profiles

Services

Categories

Provider Requests

Bookings

Reviews

Notifications

Documents

---

# Architecture

React

↓

React Router

↓

Context + React Query

↓

Supabase Client

↓

Supabase Database

↓

Supabase Storage