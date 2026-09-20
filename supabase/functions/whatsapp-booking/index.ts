import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/**
 * Helper to send messages back to the WhatsApp user via Meta Graph API
 */
async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  messageBody: string,
) {
  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { preview_url: false, body: messageBody },
    }),
  });

  const responseData = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[WhatsApp Outbound Error]:', JSON.stringify(responseData));
  } else {
    console.log('[WhatsApp Message Sent Successfully]:', responseData?.messages?.[0]?.id);
  }
  return responseData;
}

/**
 * Find or auto-register a customer profile using their WhatsApp phone number.
 * This handles friction-free auto-login for WhatsApp users!
 */
async function findOrCreateCustomer(
  adminClient: ReturnType<typeof createClient>,
  rawPhone: string,
  contactName: string,
) {
  // Normalize phone (strip non-digits, ensure + prefix if needed)
  const digits = rawPhone.replace(/\D/g, '');
  const formattedPhone = digits.startsWith('+') ? digits : `+${digits}`;

  // 1. Check if user profile already exists with this phone number
  const { data: existingProfile } = await adminClient
    .from('profiles')
    .select('id, full_name, phone, role')
    .or(`phone.eq.${formattedPhone},phone.eq.${digits}`)
    .maybeSingle();

  if (existingProfile) {
    console.log('[WhatsApp Auth] Found existing customer profile:', existingProfile.id);
    return existingProfile.id;
  }

  // 2. Profile does not exist -> Auto-create Auth User & Profile
  console.log('[WhatsApp Auth] Auto-creating new user for phone:', formattedPhone);
  const dummyEmail = `wa_${digits}@sevalink.app`;
  const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
    email: dummyEmail,
    phone: formattedPhone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: contactName || 'WhatsApp Customer', source: 'whatsapp' },
  });

  let userId: string;

  if (createAuthError || !authUser?.user) {
    console.warn('[WhatsApp Auth] User creation fallback:', createAuthError?.message);
    // If creation by phone fails (e.g. phone already in auth.users), lookup by email/phone
    const { data: usersList } = await adminClient.auth.admin.listUsers();
    const matchedUser = usersList.users.find(
      (u) => u.phone === formattedPhone || u.email === dummyEmail,
    );
    if (matchedUser) {
      userId = matchedUser.id;
    } else {
      // Generate a new UUID if necessary
      userId = crypto.randomUUID();
    }
  } else {
    userId = authUser.user.id;
  }

  // 3. Insert or update the public.profiles record
  const { error: profileError } = await adminClient.from('profiles').upsert(
    {
      id: userId,
      full_name: contactName || 'WhatsApp Customer',
      phone: formattedPhone,
      role: 'customer',
      approval_status: 'approved',
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    console.error('[WhatsApp Profile Error]:', profileError.message);
  }

  return userId;
}

serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
  const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '1361711500353184';
  const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? 'sevalink_whatsapp_secret';

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // --------------------------------------------------------------------------
  // 1. GET Method: Webhook Verification for Meta Developers Portal
  // --------------------------------------------------------------------------
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('[WhatsApp Webhook Verification Request]', { mode, token });

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook Verified Successfully]');
      return new Response(challenge, { status: 200 });
    } else {
      console.error('[WhatsApp Verification Failed] Token mismatch');
      return new Response('Forbidden: Verify token mismatch', { status: 403 });
    }
  }

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  // --------------------------------------------------------------------------
  // 2. POST Method: Process Incoming WhatsApp Webhook Events
  // --------------------------------------------------------------------------
  try {
    const body = await req.json();
    console.log('[WhatsApp Incoming Payload]:', JSON.stringify(body, null, 2));

    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];
    const contact = value?.contacts?.[0];

    // If payload isn't a user message (e.g. status updates, read receipts), return 200 OK immediately
    if (!message) {
      return jsonResponse({ status: 'ignored', message: 'No inbound user message' });
    }

    const fromNumber = message.from; // Sender WhatsApp Phone Number (e.g. "919876543210")
    const contactName = contact?.profile?.name || 'Customer';
    const messageType = message.type;
    const textBody = (message?.text?.body || '').trim().toLowerCase();

    console.log(`[WhatsApp Inbound] From: ${fromNumber} (${contactName}) | Text: "${textBody}"`);

    // Step A: Find or Auto-Register Customer Profile
    const customerId = await findOrCreateCustomer(adminClient, fromNumber, contactName);

    // Step B: Bot Logic & Command Handling
    if (textBody === 'hi' || textBody === 'hello' || textBody === 'help' || textBody === 'start') {
      // Send Welcome & Available Categories / Commands
      const { data: services } = await adminClient
        .from('services')
        .select('id, name, description')
        .limit(5);

      const serviceListText = (services || [])
        .map((s, idx) => `*${idx + 1}. ${s.name}* - ${s.description || 'Quality service'}`)
        .join('\n');

      const reply = `👋 *Welcome to SevaLink Services!*\n\n` +
        `Hi ${contactName}, you are automatically logged in with your phone number.\n\n` +
        `*Available Services:*\n${serviceListText || '1. Elite Cleaning\n2. In-Home Nursing\n3. Relocation\n4. Plumbing'}\n\n` +
        `👉 Reply with *BOOK <Service Name>* (e.g., *BOOK Cleaning*) to place a instant booking request!\n` +
        `👉 Or visit our Web App: https://sevalink.app/services`;

      await sendWhatsAppMessage(whatsappPhoneId, whatsappToken, fromNumber, reply);
      return jsonResponse({ success: true, action: 'sent_welcome' });
    }

    // Command: "BOOK <service_name>"
    if (textBody.startsWith('book') || textBody.includes('booking')) {
      const parts = textBody.replace(/^book\s*/i, '').trim();
      let serviceTitle = parts || 'General Home Service';

      // Find matching service in database
      const { data: matchedService } = await adminClient
        .from('services')
        .select('id, name')
        .ilike('name', `%${serviceTitle}%`)
        .maybeSingle();

      const finalServiceId = matchedService?.id || null;
      const finalTitle = matchedService?.name || (serviceTitle.length > 0 ? serviceTitle : 'Home Maintenance');

      // Pick a verified provider or leave unassigned for admin/provider matching
      const { data: provider } = await adminClient
        .from('providers')
        .select('id, business_name')
        .eq('verified', true)
        .limit(1)
        .maybeSingle();

      // Generate random booking code e.g. BK-59201
      const bookingCode = `BK-${Math.floor(10000 + Math.random() * 90000)}`;
      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

      // Create Booking Record in Supabase
      const { data: newBooking, error: bookingError } = await adminClient
        .from('bookings')
        .select('id, booking_code')
        .insert({
          booking_code: bookingCode,
          customer_id: customerId,
          service_id: finalServiceId,
          provider_id: provider?.id || null,
          service_title: finalTitle,
          customer_name: contactName,
          provider_name: provider?.business_name || 'Assigned Provider',
          scheduled_date: scheduledDate,
          status: 'pending',
          amount: 500,
          address: 'WhatsApp Booking Address (To be confirmed)',
          notes: `Booked via WhatsApp by ${fromNumber}`,
        })
        .select()
        .single();

      if (bookingError) {
        console.error('[WhatsApp Booking Error]:', bookingError);
        await sendWhatsAppMessage(
          whatsappPhoneId,
          whatsappToken,
          fromNumber,
          `⚠️ Sorry ${contactName}, we could not process your booking right now. Please try booking on https://sevalink.app/services`,
        );
        return jsonResponse({ error: 'Failed to create booking', detail: bookingError.message }, 500);
      }

      // Create Notification in Supabase
      await adminClient.from('notifications').insert({
        receiver_id: customerId,
        user_id: customerId,
        booking_id: newBooking.id,
        type: 'booking_created',
        title: 'New WhatsApp Booking',
        message: `Your booking for ${finalTitle} (${bookingCode}) has been placed via WhatsApp.`,
        is_read: false,
        read: false,
      });

      // Send Confirmation back to User on WhatsApp
      const confirmationMsg = `✅ *Booking Confirmed!*\n\n` +
        `📍 *Booking Code:* ${bookingCode}\n` +
        `🛠️ *Service:* ${finalTitle}\n` +
        `👤 *Customer:* ${contactName}\n` +
        `📅 *Scheduled Date:* Tomorrow\n` +
        `📊 *Status:* Pending Provider Acceptance\n\n` +
        `🔗 *Manage or Track Your Booking:* \nhttps://sevalink.app/customer/bookings/${newBooking.id}\n\n` +
        `Thank you for using SevaLink! 🙏`;

      await sendWhatsAppMessage(whatsappPhoneId, whatsappToken, fromNumber, confirmationMsg);

      return jsonResponse({
        success: true,
        booking_id: newBooking.id,
        booking_code: bookingCode,
      });
    }

    // Default Fallback Response
    const defaultReply = `Hi ${contactName}! 👋\n\n` +
      `To book a service, reply with *BOOK <Service Name>* (e.g. *BOOK Cleaning*).\n\n` +
      `Or explore all verified service providers on our web app: https://sevalink.app`;

    await sendWhatsAppMessage(whatsappPhoneId, whatsappToken, fromNumber, defaultReply);

    return jsonResponse({ success: true, action: 'sent_default_reply' });
  } catch (err) {
    console.error('[WhatsApp Webhook Exception]:', err);
    return jsonResponse({ error: 'Internal server error', detail: (err as Error).message }, 500);
  }
});
