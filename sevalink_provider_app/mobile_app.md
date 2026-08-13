# SevaLink Provider Mobile App Plan

## Source Module
- Website reference: `website/src/pages/provider/provider-pages.jsx`
- Shared backend: Supabase project in `sevalink_app/lib/core/supabase_config.dart`
- Main provider tables: `profiles`, `providers`, `provider_services`, `service_requests`, `bookings`, `notifications`, `conversations`, `messages`

## Features To Add
- [x] Provider login and signup with Supabase Auth, using `role = provider`.
- [x] Auth gate that restores existing Supabase sessions and routes signed-in providers into the app.
- [x] Provider dashboard showing today's bookings, pending requests, completed jobs, revenue, and average rating.
- [x] Booking list filtered to the logged-in provider record.
- [x] Booking detail screen with customer, service, schedule, address, notes, payment/status information.
- [x] Provider booking actions matching the website module: accept, reject, request reschedule, mark in progress, complete.
- [x] Booking chat enabled after accepted/confirmed/in-progress/completed statuses.
- [x] Chat message loading, sending, and read receipt updates via Supabase conversations/messages.
- [x] Notification list with unread state, mark read, mark all read, and booking deep-linking.
- [x] Provider service management: view enrolled services, add services from catalog, remove editable services, set prices, and save.
- [x] Request a new service type from the provider app.
- [x] Provider business profile editing with business name, phone, location, experience, certificates, image URL, and about text.
- [x] Supabase client initialization in Flutter using the same project URL and anon key as the existing customer app and website.

## Implementation Notes
- The provider app replaces the default Flutter counter with `SevaLinkProviderApp`.
- The app uses `supabase_flutter` directly and keeps the implementation local to `lib/main.dart` for now so the first provider build is complete and easy to inspect.
- Booking status changes rely on the existing Supabase database triggers to create confirmation notifications and booking conversations.
- Chat attachments are not included in the first mobile pass; text chat is wired. The website already supports image/file attachment upload.

## Completion Log
- Added the planning document before implementation.
- Added Supabase dependencies to `pubspec.yaml`.
- Implemented provider auth and session restoration.
- Implemented provider shell with Dashboard, Bookings, Services, Notifications, and Profile tabs.
- Implemented booking details, status actions, and chat.
- Implemented notifications and provider service/profile management.
- Added loading states and error feedback around status updates, chat send/load, service save/request, notification actions, and profile save.
- Fixed stale booking status refresh by reloading dashboard/booking lists after returning from booking details and reloading chat when booking status changes.
