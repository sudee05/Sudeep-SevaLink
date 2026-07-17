# Notifications and Chat

## Database setup

Run `supabase/notifications-chat.sql` after the base `supabase/schema.sql`.

It adds:

- Notification trigger events for booking, provider approval, and service request status changes.
- `conversations` and `messages` tables.
- RLS policies for notification receivers and booking participants.
- Private `chat-attachments` Supabase Storage bucket policies.
- Supabase Realtime publication entries for `notifications`, `conversations`, and `messages`.

## Booking status usage

Provider accept:

```js
await updateBookingStatus(booking.id, 'accepted')
```

Provider reject:

```js
await updateBookingStatus(booking.id, 'rejected')
```

Provider requests reschedule:

```js
await updateBookingStatus(booking.id, 'reschedule_requested')
```

Customer accepts reschedule:

```js
await updateBookingStatus(booking.id, 'reschedule_accepted')
```

## Chat usage

Chat is enabled when booking status is `accepted`, `confirmed`, `in_progress`, or `completed`.

```jsx
<BookingChatPanel booking={booking} userId={profile.id} />
```

The panel uses:

- `useConversationByBookingQuery(booking.id)`
- `useMessagesQuery(conversation.id)`
- `useRealtimeConversation(conversation.id, profile.id)`
- `sendMessage(...)`
- `uploadChatAttachment(...)`
- `markConversationRead(...)`

## Notification usage

```jsx
const notifications = useNotificationsQuery(profile.id)
useRealtimeNotifications(profile.id)
```

Unread notifications are shown in `PortalTopbar`, and the notifications page supports marking one or all notifications as read.
