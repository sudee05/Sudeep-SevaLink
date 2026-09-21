ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';