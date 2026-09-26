// SevaLink WhatsApp Booking Bot — Supabase Edge Function (Deno runtime)
//
// Converted from a Node.js `http` server. Key differences from the Node version:
//   - Runs on Deno, not Node: no `require`, `fs`, `path`, or Node `http`.
//   - Config comes from `Deno.env.get(...)` (Supabase project secrets), not a
//     hand-parsed `.env` file — set secrets with `supabase secrets set KEY=value`.
//   - The Kannada strings live in ./kn-strings.ts instead of a JSON file read
//     from disk (the original Windows/Node Unicode-in-template-literal issue
//     that motivated the Romanization comment doesn't apply here; the JSON
//     values were already plain Kannada script, so they're carried over as-is).
//   - The webhook responds immediately and continues processing via
//     `EdgeRuntime.waitUntil`, since a serverless isolate can be frozen the
//     instant a response is returned.
//
// Session state and duplicate-message tracking live in Supabase tables
// (`whatsapp_sessions`, `whatsapp_processed_messages`), NOT an in-memory
// Map/Set. An earlier version of this file used plain in-memory state, which
// only works as long as every request lands on the same warm isolate — Edge
// Functions cold-start on most invocations, which wiped state between almost
// every message and made the bot re-ask for language forever. See the SQL
// below for the tables this file expects to already exist.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/* env                                                                  */
/* ------------------------------------------------------------------ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://giygtxqatkrgjeuojgma.supabase.co";
const SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
const WHATSAPP_ACCESS_TOKEN = (Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "").trim();
const WHATSAPP_PHONE_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "sevalink_whatsapp_secret_sudeep";
const PROVIDER_WEBSITE = "https://sudeep-seva-link.vercel.app/provider";
// ASSUMPTION: guessing the route based on the other website constants below.
// Confirm this matches your actual payment page and adjust if not.
const PAYMENT_WEBSITE = "https://sudeep-seva-link.vercel.app/pay";
const CUSTOMER_REGISTER_WEBSITE = "https://sudeep-seva-link.vercel.app/register";
const CUSTOMER_LOGIN_WEBSITE = "https://sudeep-seva-link.vercel.app/login";
const SEVALINK_LOGO_URL =
  "https://giygtxqatkrgjeuojgma.supabase.co/storage/v1/object/public/avatars/sevalink_logo.png";

if (!SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY as a function secret.",
  );
}
if (!WHATSAPP_PHONE_ID) {
  console.warn("WARNING: WHATSAPP_PHONE_NUMBER_ID is not set — outbound sends will fail.");
}

const adminClient: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

import { KN_STRINGS } from "./kn-strings.ts";

/* ------------------------------------------------------------------ */
/* outbound helpers                                                    */
/* ------------------------------------------------------------------ */

// deno-lint-ignore no-explicit-any
async function callMeta(payload: Record<string, any>): Promise<any> {
  if (!WHATSAPP_ACCESS_TOKEN) {
    console.log("\n[MOCK OUTBOUND]", JSON.stringify(payload, null, 2), "\n");
    return { mock: true };
  }
  const url = "https://graph.facebook.com/v25.0/" + WHATSAPP_PHONE_ID + "/messages";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + WHATSAPP_ACCESS_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[Meta send FAILED " + res.status + "]", JSON.stringify(data));
      return { error: data && data.error };
    }
    console.log("[Meta send ok]", (data.messages && data.messages[0] && data.messages[0].id) || "");
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Meta fetch error]", message);
    return { error: message };
  }
}

function sendText(to: string, body: string) {
  return callMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: false, body },
  });
}

function sendImage(to: string, imageUrl: string, caption?: string) {
  return callMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "image",
    image: { link: imageUrl, caption: caption || "" },
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ListItem {
  id: string;
  title: string;
  description?: string;
  [key: string]: unknown;
}

function sendList(to: string, bodyText: string, buttonLabel: string, items: ListItem[], sectionTitle?: string) {
  const rows = items.slice(0, 10).map((item) => ({
    id: item.id,
    title: String(item.title).slice(0, 24),
    description: item.description ? String(item.description).slice(0, 72) : undefined,
  }));
  return callMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{ title: (sectionTitle || "Options").slice(0, 24), rows }],
      },
    },
  });
}

interface ButtonSpec {
  id: string;
  title: string;
}

function sendButtons(to: string, bodyText: string, buttons: ButtonSpec[]) {
  return callMeta({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: "reply",
          reply: { id: b.id, title: String(b.title).slice(0, 20) },
        })),
      },
    },
  });
}

function numberedBody(bodyText: string, items: ListItem[]): string {
  return bodyText + "\n\n" + items.map((item, i) => (i + 1) + ". " + item.title).join("\n");
}

/* ------------------------------------------------------------------ */
/* session — 5-minute inactivity timeout                              */
/* ------------------------------------------------------------------ */
/* Persisted in Supabase — see the CAVEAT at the top of this file. */

const SESSION_TTL_MS = 5 * 60 * 1000;

// deno-lint-ignore no-explicit-any
interface Session {
  step: string;
  profile: any;
  lang: "en" | "kn" | null;
  draft: any;
  updatedAt: number;
  expired: boolean;
}

// Sessions are persisted in a Supabase table (`whatsapp_sessions`) instead of
// an in-memory Map. Edge Function isolates cold-start on most invocations —
// nothing in the same process survives between requests — so an in-memory
// Map loses every user's conversation state almost immediately. See the
// `whatsapp_sessions` table DDL shipped alongside this file.
// Duplicate-delivery guard, persisted in the `whatsapp_processed_messages`
// table for the same reason sessions are: an in-memory Set doesn't survive
// a cold start, and WhatsApp does retry webhook deliveries.
async function isDuplicateMessage(messageId: string): Promise<boolean> {
  const { error } = await adminClient.from("whatsapp_processed_messages").insert({ message_id: messageId });
  if (!error) return false;
  if (error.code === "23505") return true; // unique violation -> already processed
  console.warn("[isDuplicateMessage]", error.message);
  return false; // fail open rather than silently dropping a real message
}

async function getSession(phone: string): Promise<Session> {
  const { data, error } = await adminClient
    .from("whatsapp_sessions")
    .select("step, lang, profile, draft, updated_at")
    .eq("phone", phone)
    .maybeSingle();
  if (error) console.warn("[getSession]", error.message);

  const now = Date.now();
  if (data) {
    const updatedAt = new Date(data.updated_at).getTime();
    const stillFresh = now - updatedAt < SESSION_TTL_MS;
    return {
      step: stillFresh ? data.step : "init",
      profile: stillFresh ? data.profile : null,
      lang: data.lang, // language choice survives a session timeout
      draft: stillFresh ? data.draft || {} : {},
      updatedAt: stillFresh ? updatedAt : now,
      expired: !stillFresh,
    };
  }

  return { step: "init", profile: null, lang: null, draft: {}, updatedAt: now, expired: false };
}

async function saveSession(phone: string, session: Session): Promise<void> {
  session.updatedAt = Date.now();
  session.expired = false;
  const { error } = await adminClient.from("whatsapp_sessions").upsert({
    phone,
    step: session.step,
    lang: session.lang,
    profile: session.profile,
    draft: session.draft,
    updated_at: new Date(session.updatedAt).toISOString(),
  });
  if (error) console.warn("[saveSession]", error.message);
}

/* ------------------------------------------------------------------ */
/* i18n — English + Kannada                                            */
/* ------------------------------------------------------------------ */

interface Provider {
  providerId: string;
  price: number;
  businessName: string;
  rating?: number | string;
  experience?: string;
  about?: string;
  verified?: boolean;
  certificates?: string[];
  imageUrl?: string;
}

interface BookingSummaryInput {
  service: string;
  provider: string;
  date: string;
  time: string;
  price: number;
  address: string;
}

interface BookingCreatedInput {
  service: string;
  provider: string;
  date: string;
  time: string;
  email: string;
}

// deno-lint-ignore no-explicit-any
interface BookingRow {
  booking_code: string;
  service_title: string;
  provider_name: string;
  booking_date: string | null;
  booking_time: string | null;
  status: string;
  amount: number;
  address: string;
  [key: string]: any;
}

// deno-lint-ignore no-explicit-any
type MsgValue = string | ((...args: any[]) => string);

interface MsgTable {
  [key: string]: MsgValue;
}

const MSG: { en: MsgTable; kn: MsgTable } = {
  en: {
    chooseLang: "Welcome to SevaLink!\n\nPlease choose your language.",
    welcome: "Welcome to SevaLink.",
    sessionExpired: "Your session timed out after 5 minutes. Starting fresh.",
    askName: "You are new here. Please send your full name.",
    askEmail: "Thanks. Please send your email address.",
    invalidEmail: "That does not look like a valid email. Please try again.",
    profileCreated: (name: string) => "Thanks " + name + ", your account is set up.",
    chooseCategory: "Please choose a category.",
    noCategories: "No categories available right now. Please try again later.",
    chooseService: "Please choose a service.",
    noServices: "No services found in this category. Reply MENU to start over.",
    chooseProvider: "Please choose a provider.",
    noProviders: "No approved providers available for this service. Reply MENU to start over.",
    providerSummary: (p: Provider) =>
      p.businessName +
      "\nRating: " + (p.rating || "Not rated yet") +
      "\nExperience: " + (p.experience || "Not specified") +
      "\nPrice: Rs. " + p.price +
      "\n\nWhat would you like to do?",
    providerDetails: (p: Provider) =>
      p.businessName +
      "\n\nAbout: " + (p.about || "No description.") +
      "\nExperience: " + (p.experience || "Not specified") +
      "\nRating: " + (p.rating || "Not rated yet") +
      "\nVerified: " + (p.verified ? "Yes" : "No") +
      "\nPrice: Rs. " + p.price,
    askAddress: "Please send the address where the service is needed.",
    askDate: "Please enter the preferred date.\nFormat: DD/MM/YYYY  e.g. 25/09/2026",
    invalidDate: "Invalid date. Please use DD/MM/YYYY format, e.g. 25/09/2026",
    askTime: "Please enter the preferred time.\nFormat: HH:MM AM/PM  e.g. 10:30 AM  or 24h e.g. 14:30",
    invalidTime: "Invalid time. Please use HH:MM AM/PM or 24h format.",
    confirmBooking: (s: BookingSummaryInput) =>
      "Please confirm your booking.\n\nService: " + s.service +
      "\nProvider: " + s.provider +
      "\nDate: " + s.date +
      "\nTime: " + s.time +
      "\nPrice: Rs. " + s.price +
      "\nAddress: " + s.address,
    bookingCreated: (code: string, s: BookingCreatedInput) =>
      "Thank you for your booking!\n\nBooking confirmed.\n\nCode: " + code +
      "\nService: " + s.service +
      "\nProvider: " + s.provider +
      "\nDate: " + s.date +
      "\nTime: " + s.time +
      "\nStatus: Pending provider confirmation." +
      "\n\nTo monitor your booking status and view details, register on our website using the same email address (" +
      s.email + "):\n" + CUSTOMER_REGISTER_WEBSITE + "?email=" + encodeURIComponent(s.email || "") +
      "\n\nAlready have an account? Log in here:\n" + CUSTOMER_LOGIN_WEBSITE,
    bookingFailed: "Something went wrong while creating your booking. Please try again.",
    cancelled: "Booking cancelled.",
    invalid: "Sorry, I did not understand that. Please choose one of the options shown.",
    genericError: "Something went wrong. Please try again in a moment.",
    noBookings: "You have no recent bookings. Reply MENU to make a new booking.",
    chooseBooking: "Here are your recent bookings. Select one to view details.",
    bookingDetail: (b: BookingRow) =>
      "Booking: " + b.booking_code +
      "\nService: " + b.service_title +
      "\nProvider: " + b.provider_name +
      "\nDate: " + (b.booking_date || "Not set") +
      "\nTime: " + (b.booking_time || "Not set") +
      "\nStatus: " + b.status +
      "\nAmount: Rs. " + b.amount +
      "\nAddress: " + b.address,
    cannotCancel: (status: string) =>
      'This booking cannot be cancelled (status: "' + status + '"). Only pending or accepted bookings can be cancelled.',
    confirmCancel: "Are you sure you want to cancel this booking?",
    cancelSuccess: (code: string) => "Booking " + code + " has been cancelled successfully.",
    cancelFailed: "Could not cancel the booking. Please try again.",
    paymentLink: (b: BookingRow, url: string) =>
      "Payment pending for booking " + b.booking_code +
      "\nAmount: Rs. " + b.amount +
      "\n\nComplete your payment here:\n" + url,
    btnBook: "Book",
    btnViewDetails: "View Details",
    btnBack: "Back",
    btnConfirm: "Confirm",
    btnCancel: "Cancel",
    btnPayNow: "Pay Now",
    btnYes: "Yes, Cancel",
    btnNo: "No, Keep It",
    btnOk: "OK",
    lblCategories: "Categories",
    lblServices: "Services",
    lblProviders: "Providers",
    lblBookings: "My Bookings",
    mainMenuBody: (name: string) => "Hello " + name + "! How can we help you today?",
    mainMenuBodyNew: "Welcome! What would you like to do?",
    menuBookService: "Book a Service",
    menuMyBookings: "My Bookings",
    menuHelp: "Help",
    menuBookDesc: "Find and book a service provider",
    menuBookingsDesc: "View or cancel your bookings",
    menuHelpDesc: "Learn how to use SevaLink",
    menuChooseBtn: "Choose",
    menuLabel: "Main Menu",
    helpText:
      'Help:\n- Send "1" or "Book a Service" to find and book.\n- Send "2" or "My Bookings" to view or cancel bookings.\n- Send MENU at any time to return to this menu.',
  },

  kn: {
    chooseLang: KN_STRINGS.chooseLang,
    welcome: KN_STRINGS.welcome,
    sessionExpired: KN_STRINGS.sessionExpired,
    askName: KN_STRINGS.askName,
    askEmail: KN_STRINGS.askEmail,
    invalidEmail: KN_STRINGS.invalidEmail,
    profileCreated: (name: string) => KN_STRINGS.profileCreated_prefix + name + KN_STRINGS.profileCreated_suffix,
    chooseCategory: KN_STRINGS.chooseCategory,
    noCategories: KN_STRINGS.noCategories,
    chooseService: KN_STRINGS.chooseService,
    noServices: KN_STRINGS.noServices,
    chooseProvider: KN_STRINGS.chooseProvider,
    noProviders: KN_STRINGS.noProviders,
    providerSummary: (p: Provider) =>
      p.businessName +
      KN_STRINGS.providerSummary_rating + (p.rating || KN_STRINGS.providerSummary_norating) +
      KN_STRINGS.providerSummary_exp + (p.experience || KN_STRINGS.providerSummary_noexp) +
      KN_STRINGS.providerSummary_price + p.price +
      KN_STRINGS.providerSummary_action,
    providerDetails: (p: Provider) =>
      p.businessName +
      KN_STRINGS.providerDetails_about + (p.about || KN_STRINGS.providerDetails_noabout) +
      KN_STRINGS.providerDetails_exp + (p.experience || KN_STRINGS.providerDetails_noexp) +
      KN_STRINGS.providerDetails_rating + (p.rating || KN_STRINGS.providerDetails_norating) +
      (p.verified ? KN_STRINGS.providerDetails_verified_yes : KN_STRINGS.providerDetails_verified_no) +
      KN_STRINGS.providerDetails_price + p.price,
    askAddress: KN_STRINGS.askAddress,
    askDate: KN_STRINGS.askDate,
    invalidDate: KN_STRINGS.invalidDate,
    askTime: KN_STRINGS.askTime,
    invalidTime: KN_STRINGS.invalidTime,
    confirmBooking: (x: BookingSummaryInput) =>
      KN_STRINGS.confirmBooking_header +
      KN_STRINGS.confirmBooking_service + x.service +
      KN_STRINGS.confirmBooking_provider + x.provider +
      KN_STRINGS.confirmBooking_date + x.date +
      KN_STRINGS.confirmBooking_time + x.time +
      KN_STRINGS.confirmBooking_price + x.price +
      KN_STRINGS.confirmBooking_address + x.address,
    bookingCreated: (code: string, x: BookingCreatedInput) =>
      KN_STRINGS.bookingCreated_header +
      KN_STRINGS.bookingCreated_code + code +
      KN_STRINGS.bookingCreated_service + x.service +
      KN_STRINGS.bookingCreated_provider + x.provider +
      KN_STRINGS.bookingCreated_date + x.date +
      KN_STRINGS.bookingCreated_time + x.time +
      KN_STRINGS.bookingCreated_status + "\n\n" +
      KN_STRINGS.bookingWebsiteNotice_prefix + x.email + KN_STRINGS.bookingWebsiteNotice_suffix + "\n" +
      CUSTOMER_REGISTER_WEBSITE + "?email=" + encodeURIComponent(x.email || "") + "\n\n" +
      KN_STRINGS.bookingLoginNotice + "\n" + CUSTOMER_LOGIN_WEBSITE,
    bookingFailed: KN_STRINGS.bookingFailed,
    cancelled: KN_STRINGS.cancelled,
    invalid: KN_STRINGS.invalid,
    genericError: KN_STRINGS.genericError,
    noBookings: KN_STRINGS.noBookings,
    chooseBooking: KN_STRINGS.chooseBooking,
    bookingDetail: (b: BookingRow) =>
      KN_STRINGS.bookingDetail_code + b.booking_code +
      KN_STRINGS.bookingDetail_service + b.service_title +
      KN_STRINGS.bookingDetail_provider + b.provider_name +
      KN_STRINGS.bookingDetail_date + (b.booking_date || KN_STRINGS.bookingDetail_nodate) +
      KN_STRINGS.bookingDetail_time + (b.booking_time || KN_STRINGS.bookingDetail_notime) +
      KN_STRINGS.bookingDetail_status + b.status +
      KN_STRINGS.bookingDetail_amount + b.amount +
      KN_STRINGS.bookingDetail_address + b.address,
    cannotCancel: (status: string) => KN_STRINGS.cannotCancel_prefix + status + KN_STRINGS.cannotCancel_suffix,
    confirmCancel: KN_STRINGS.confirmCancel,
    cancelSuccess: (code: string) => KN_STRINGS.cancelSuccess_prefix + code + KN_STRINGS.cancelSuccess_suffix,
    cancelFailed: KN_STRINGS.cancelFailed,
    paymentLink: (b: BookingRow, url: string) =>
      KN_STRINGS.paymentLink_prefix + b.booking_code + KN_STRINGS.paymentLink_amount + b.amount +
      KN_STRINGS.paymentLink_suffix + url,
    btnBook: KN_STRINGS.btnBook,
    btnViewDetails: KN_STRINGS.btnViewDetails,
    btnBack: KN_STRINGS.btnBack,
    btnConfirm: KN_STRINGS.btnConfirm,
    btnCancel: KN_STRINGS.btnCancel,
    btnPayNow: KN_STRINGS.btnPayNow,
    btnYes: KN_STRINGS.btnYes,
    btnNo: KN_STRINGS.btnNo,
    btnOk: KN_STRINGS.btnOk,
    lblCategories: KN_STRINGS.lblCategories,
    lblServices: KN_STRINGS.lblServices,
    lblProviders: KN_STRINGS.lblProviders,
    lblBookings: KN_STRINGS.lblBookings,
    mainMenuBody: (name: string) => KN_STRINGS.mainMenuBody_prefix + name + KN_STRINGS.mainMenuBody_suffix,
    mainMenuBodyNew: KN_STRINGS.mainMenuBodyNew,
    menuBookService: KN_STRINGS.menuBookService,
    menuMyBookings: KN_STRINGS.menuMyBookings,
    menuHelp: KN_STRINGS.menuHelp,
    menuBookDesc: "",
    menuBookingsDesc: "",
    menuHelpDesc: "",
    menuChooseBtn: KN_STRINGS.chooseBtn,
    menuLabel: KN_STRINGS.mainMenuLabel,
    helpText:
      KN_STRINGS.menuHelp_header + "\n" + KN_STRINGS.menuHelp_book + "\n" + KN_STRINGS.menuHelp_view + "\n" +
      KN_STRINGS.menuHelp_menu,
  },
};

// deno-lint-ignore no-explicit-any
function t(session: Session, key: string, ...rest: any[]): string {
  const lang = session.lang || "en";
  const strings = MSG[lang] || MSG.en;
  const val = strings[key] !== undefined ? strings[key] : MSG.en[key];
  if (typeof val === "function") return val(...rest);
  return val !== undefined ? (val as string) : key;
}

/* ------------------------------------------------------------------ */
/* data access                                                         */
/* ------------------------------------------------------------------ */

async function findProfileByPhone(rawPhone: string) {
  const digits = String(rawPhone).replace(/\D/g, "");
  const formatted = "+" + digits;
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, full_name, phone, role")
    .or("phone.eq." + formatted + ",phone.eq." + digits)
    .limit(1)
    .maybeSingle();
  if (error) console.warn("[findProfileByPhone]", error.message);
  return data || null;
}

async function createProfile(opts: { phone: string; name: string; email: string }) {
  const { phone, name, email } = opts;
  const digits = String(phone).replace(/\D/g, "");
  const formatted = "+" + digits;

  const { data: created, error: authError } = await adminClient.auth.admin.createUser({
    email,
    phone: formatted,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { full_name: name, source: "whatsapp" },
  });

  // deno-lint-ignore no-explicit-any
  let authUser: any = created && created.user;

  // A WhatsApp user may already exist in Supabase Auth even when the
  // createUser call returns "already registered". Resolve that real UUID
  // instead of inventing one, because profiles.id references auth.users.id.
  if (authError) {
    console.warn("[createUser]", authError.message);
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      throw new Error("Could not resolve the existing WhatsApp account: " + listError.message);
    }

    const normalizedEmail = String(email || "").trim().toLowerCase();
    authUser = (usersData.users || []).find((user) => {
      const userPhone = String(user.phone || "").replace(/\D/g, "");
      return (
        (normalizedEmail && String(user.email || "").toLowerCase() === normalizedEmail) ||
        (userPhone && (userPhone === digits || userPhone.endsWith(digits) || digits.endsWith(userPhone)))
      );
    });
  }

  if (!authUser?.id) {
    throw new Error("Could not create or find the WhatsApp customer account.");
  }

  const { data: profile, error: upsertError } = await adminClient
    .from("profiles")
    .upsert({
      id: authUser.id,
      full_name: name,
      phone: formatted,
      role: "customer",
      approval_status: "approved",
    })
    .select("id, full_name, phone, role")
    .single();

  if (upsertError) {
    console.warn("[profiles upsert]", upsertError.message);
    throw upsertError;
  }

  return profile;
}

async function fetchCategories() {
  const { data, error } = await adminClient.from("categories").select("id, name, description").order("name").limit(9);
  if (error) console.warn("[fetchCategories]", error.message);
  return data || [];
}

async function fetchServices(categoryId: string) {
  const { data, error } = await adminClient
    .from("services")
    .select("id, name, description")
    .eq("category_id", categoryId)
    .order("name")
    .limit(9);
  if (error) console.warn("[fetchServices]", error.message);
  return data || [];
}

// Approval is checked via providers.status = 'approved' (NOT profiles.approval_status)
async function fetchProviders(serviceId: string): Promise<Provider[]> {
  const { data, error } = await adminClient
    .from("provider_services")
    .select(
      "price, provider_id, providers!inner(id, business_name, rating, experience, about, verified, status, certificates, image_url)",
    )
    .eq("service_id", serviceId)
    .eq("providers.status", "approved")
    .limit(9);
  if (error) {
    console.warn("[fetchProviders]", error.message);
    return [];
  }
  if (data.length === 0) {
    const { data: unfiltered } = await adminClient
      .from("provider_services")
      .select("provider_id, providers(business_name, status)")
      .eq("service_id", serviceId);
    if (!unfiltered || unfiltered.length === 0) {
      console.warn("[fetchProviders] No providers linked to service_id=" + serviceId);
    } else {
      console.warn(
        "[fetchProviders] Providers exist but none approved. Statuses: " +
          unfiltered
            // deno-lint-ignore no-explicit-any
            .map((r: any) => (r.providers && r.providers.business_name) + ": " + (r.providers && r.providers.status))
            .join(", "),
      );
    }
    return [];
  }
  // deno-lint-ignore no-explicit-any
  return data.map((row: any) => ({
    providerId: row.provider_id,
    price: row.price,
    businessName: row.providers.business_name,
    rating: row.providers.rating,
    experience: row.providers.experience,
    about: row.providers.about,
    verified: row.providers.verified,
    certificates: row.providers.certificates || [],
    imageUrl: row.providers.image_url || "",
  }));
}

async function fetchCustomerBookings(customerId: string): Promise<BookingRow[]> {
  const { data, error } = await adminClient
    .from("bookings")
    .select("id, booking_code, service_title, provider_name, status, booking_date, booking_time, amount, address")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) {
    console.warn("[fetchCustomerBookings]", error.message);
    return [];
  }
  return data || [];
}

async function cancelBooking(bookingId: string, customerId: string) {
  const { data: existing, error: fetchErr } = await adminClient
    .from("bookings")
    .select("id, status, booking_code, customer_id")
    .eq("id", bookingId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (fetchErr || !existing) {
    console.warn("[cancelBooking] fetch error:", fetchErr && fetchErr.message);
    return { success: false, status: null as string | null };
  }
  if (!["pending", "accepted"].includes(existing.status)) {
    return { success: false, status: existing.status as string | null };
  }
  const { error: updateErr } = await adminClient
    .from("bookings")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("customer_id", customerId);
  if (updateErr) {
    console.warn("[cancelBooking] update error:", updateErr.message);
    return { success: false, status: existing.status as string | null };
  }
  return { success: true, bookingCode: existing.booking_code as string };
}

async function getProviderPhone(providerId: string): Promise<string | null> {
  const { data, error } = await adminClient
    .from("providers")
    .select("user_id, profiles!inner(phone)")
    .eq("id", providerId)
    .maybeSingle();
  if (error) {
    console.warn("[getProviderPhone]", error.message);
    return null;
  }
  // deno-lint-ignore no-explicit-any
  return (data && (data as any).profiles && (data as any).profiles.phone) || null;
}

async function notifyProvider(providerId: string, bookingCode: string) {
  try {
    const providerPhone = await getProviderPhone(providerId);
    if (!providerPhone) {
      console.warn("[notifyProvider] No phone for provider " + providerId);
      return;
    }
    const digits = String(providerPhone).replace(/\D/g, "");
    const to = digits.startsWith("0") ? "91" + digits.slice(1) : digits;
    await sendText(to, "You have a new booking! (Code: " + bookingCode + ")\n\nVisit your dashboard:\n" + PROVIDER_WEBSITE);
    console.log("[notifyProvider] Alert sent to " + to);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notifyProvider]", message);
  }
}

async function createBooking(opts: {
  customerId: string;
  customerName: string;
  customerPhone: string;
  provider: Provider;
  service: { id: string; name: string; title?: string };
  address: string;
  bookingDate: string;
  bookingTime: string;
}) {
  const { customerId, customerName, customerPhone, provider, service, address, bookingDate, bookingTime } = opts;
  let scheduledDate: Date;
  try {
    scheduledDate = new Date(bookingDate + "T" + bookingTime + ":00");
    if (isNaN(scheduledDate.getTime())) throw new Error("Invalid");
  } catch {
    scheduledDate = new Date(Date.now() + 86400000);
    scheduledDate.setHours(10, 0, 0, 0);
  }

  let validCustomerId: string | null = customerId;
  const { data: customerProfile } = await adminClient.from("profiles").select("id").eq("id", customerId).maybeSingle();

  if (!customerProfile) {
    validCustomerId = null;
  }

  if (!customerProfile && customerPhone) {
    const recoveredProfile = await findProfileByPhone(customerPhone);
    if (recoveredProfile) validCustomerId = recoveredProfile.id;
  }

  if (!validCustomerId) {
    throw new Error("WhatsApp customer profile was not found.");
  }

  const { data, error } = await adminClient
    .from("bookings")
    .insert({
      service_id: service.id,
      customer_id: validCustomerId,
      provider_id: provider.providerId,
      service_title: service.name,
      provider_name: provider.businessName,
      customer_name: customerName,
      scheduled_date: scheduledDate.toISOString(),
      booking_date: bookingDate,
      booking_time: bookingTime,
      status: "pending",
      amount: provider.price,
      address,
    })
    .select("id, booking_code")
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* date / time helpers                                                 */
/* ------------------------------------------------------------------ */

function parseDate(text: string): string | null {
  let m = text.trim().match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
  if (m) {
    const iso = m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0");
    if (!isNaN(new Date(iso).getTime())) return iso;
  }
  m = text.trim().match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (m) {
    const iso2 = m[1] + "-" + m[2].padStart(2, "0") + "-" + m[3].padStart(2, "0");
    if (!isNaN(new Date(iso2).getTime())) return iso2;
  }
  return null;
}

function parseTime(text: string): string | null {
  let m = text.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const mn = m[2];
    if (m[3].toLowerCase() === "pm" && h !== 12) h += 12;
    if (m[3].toLowerCase() === "am" && h === 12) h = 0;
    if (h >= 0 && h < 24 && parseInt(mn) < 60) return String(h).padStart(2, "0") + ":" + mn;
  }
  m = text.trim().match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (m) {
    const h2 = parseInt(m[1], 10);
    const mn2 = parseInt(m[2], 10);
    if (h2 >= 0 && h2 < 24 && mn2 >= 0 && mn2 < 60) return String(h2).padStart(2, "0") + ":" + String(mn2).padStart(2, "0");
  }
  return null;
}

function prettyDate(iso: string | null | undefined): string {
  if (!iso) return "Not set";
  const p = iso.split("-");
  return p[2] + "/" + p[1] + "/" + p[0];
}

function prettyTime(t24: string | null | undefined): string {
  if (!t24) return "Not set";
  const p = t24.split(":");
  const h = parseInt(p[0], 10);
  return (h % 12 || 12) + ":" + p[1] + " " + (h < 12 ? "AM" : "PM");
}

/* ------------------------------------------------------------------ */
/* keyword detection                                                   */
/* ------------------------------------------------------------------ */

const GREETINGS_EN = ["hi", "hey", "hello", "start", "menu"];
const MYBOOKINGS_EN = ["my bookings", "bookings", "my booking", "view bookings", "view booking"];

function isGreeting(inbound: Inbound): boolean {
  if (inbound.kind !== "text") return false;
  return GREETINGS_EN.includes(inbound.text.toLowerCase().trim());
}

function isMyBookings(inbound: Inbound): boolean {
  if (inbound.kind !== "text") return false;
  return MYBOOKINGS_EN.includes(inbound.text.toLowerCase().trim());
}

/* ------------------------------------------------------------------ */
/* inbound parsing                                                     */
/* ------------------------------------------------------------------ */

type Inbound =
  | { kind: "text"; text: string }
  | { kind: "list_reply"; id: string; title: string }
  | { kind: "button_reply"; id: string; title: string }
  | { kind: "unknown" };

// deno-lint-ignore no-explicit-any
function parseInbound(message: any): Inbound {
  if (message.type === "text") return { kind: "text", text: (message.text && message.text.body) || "" };
  if (message.type === "interactive") {
    const i = message.interactive;
    if (i.type === "list_reply") return { kind: "list_reply", id: i.list_reply.id, title: i.list_reply.title };
    if (i.type === "button_reply") return { kind: "button_reply", id: i.button_reply.id, title: i.button_reply.title };
  }
  return { kind: "unknown" };
}

function resolveChoice<T extends { id: string }>(inbound: Inbound, choices: T[]): T | null {
  if (inbound.kind === "list_reply" || inbound.kind === "button_reply") {
    return choices.find((c) => c.id === inbound.id) || null;
  }
  if (inbound.kind === "text") {
    const n = Number(inbound.text.trim());
    if (Number.isInteger(n) && n >= 1 && n <= choices.length) return choices[n - 1];
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* show helpers                                                        */
/* ------------------------------------------------------------------ */

async function showMainMenu(phone: string, session: Session, wasInvalid?: boolean) {
  const name = session.profile && session.profile.full_name;
  const bodyText = wasInvalid
    ? t(session, "invalid")
    : name
    ? t(session, "mainMenuBody", name)
    : t(session, "mainMenuBodyNew");
  session.step = "main_menu";
  await saveSession(phone, session);
  const items: ListItem[] = [
    { id: "menu_book", title: t(session, "menuBookService"), description: t(session, "menuBookDesc") },
    { id: "menu_bookings", title: t(session, "menuMyBookings"), description: t(session, "menuBookingsDesc") },
    { id: "menu_help", title: t(session, "menuHelp"), description: t(session, "menuHelpDesc") },
  ];
  await sendImage(phone, SEVALINK_LOGO_URL, "SevaLink");
  return sendList(phone, numberedBody(bodyText, items), t(session, "menuChooseBtn"), items, t(session, "menuLabel"));
}

async function showCategories(phone: string, session: Session, wasInvalid?: boolean) {
  const categories = await fetchCategories();
  if (categories.length === 0) return sendText(phone, t(session, "noCategories"));
  const items: ListItem[] = categories.map((c) => ({ id: c.id, title: c.name, description: c.description || "" }));
  session.draft.categories = items;
  session.step = "categories";
  await saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session, "invalid") + " " + t(session, "chooseCategory") : t(session, "chooseCategory"), items);
  return sendList(phone, body, t(session, "menuChooseBtn"), items, t(session, "lblCategories"));
}

async function showServices(phone: string, session: Session, wasInvalid?: boolean) {
  const services = await fetchServices(session.draft.category.id);
  if (services.length === 0) return sendText(phone, t(session, "noServices"));
  const items: ListItem[] = services.map((s) => ({ id: s.id, title: s.name, description: s.description || "" }));
  session.draft.services = items;
  session.step = "services";
  await saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session, "invalid") + " " + t(session, "chooseService") : t(session, "chooseService"), items);
  return sendList(phone, body, t(session, "menuChooseBtn"), items, t(session, "lblServices"));
}

async function showProviders(phone: string, session: Session, wasInvalid?: boolean) {
  const providers = await fetchProviders(session.draft.service.id);
  if (providers.length === 0) return sendText(phone, t(session, "noProviders"));
  const items: ListItem[] = providers.map((p) => ({
    id: p.providerId,
    title: p.businessName,
    description: "Rating " + (p.rating || "NA") + " - Rs. " + p.price,
    ...p,
  }));
  session.draft.providers = items;
  session.step = "providers";
  await saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session, "invalid") + " " + t(session, "chooseProvider") : t(session, "chooseProvider"), items);
  return sendList(phone, body, t(session, "menuChooseBtn"), items, t(session, "lblProviders"));
}

async function showMyBookings(phone: string, session: Session, wasInvalid?: boolean) {
  const bookings = await fetchCustomerBookings(session.profile.id);
  if (bookings.length === 0) return sendText(phone, t(session, "noBookings"));
  const items: ListItem[] = bookings.map((b) => ({
    id: b.id as unknown as string,
    title: b.booking_code,
    description: (b.service_title + " - " + b.status).slice(0, 72),
    ...b,
  }));
  session.draft.bookingList = items;
  session.step = "view_bookings";
  await saveSession(phone, session);
  const body = numberedBody(wasInvalid ? t(session, "invalid") + " " + t(session, "chooseBooking") : t(session, "chooseBooking"), items);
  return sendList(phone, body, t(session, "menuChooseBtn"), items, t(session, "lblBookings"));
}

async function showBookingDetail(phone: string, session: Session) {
  const bk = session.draft.selectedBooking as BookingRow;
  const detailText = t(session, "bookingDetail", bk);
  // ASSUMPTION: "payment_pending" is a guess at the exact status string your
  // bookings table uses — confirm/adjust this to match your schema.
  if (bk.status === "payment_pending") {
    return sendButtons(phone, detailText, [
      { id: "pay_booking", title: t(session, "btnPayNow") },
      { id: "back_to_bookings", title: t(session, "btnBack") },
    ]);
  }
  if (["pending", "accepted"].includes(bk.status)) {
    return sendButtons(phone, detailText, [
      { id: "cancel_booking", title: t(session, "btnCancel") },
      { id: "back_to_bookings", title: t(session, "btnBack") },
    ]);
  }
  return sendButtons(phone, detailText, [
    { id: "ok_done", title: t(session, "btnOk") },
    { id: "back_to_bookings", title: t(session, "btnBack") },
  ]);
}

/* ------------------------------------------------------------------ */
/* main flow handler                                                   */
/* ------------------------------------------------------------------ */

async function handleMessage(opts: { phone: string; inbound: Inbound }) {
  const { phone, inbound } = opts;
  const session = await getSession(phone);
  const wasExpired = session.expired;

  // Global: greeting resets to init
  if (isGreeting(inbound)) {
    session.step = "init";
    session.draft = {};
    await saveSession(phone, session);
  }

  // Global: MY BOOKINGS from any step (except booking sub-steps)
  const bookingSubSteps = ["view_bookings", "booking_selected", "cancel_confirm"];
  if (isMyBookings(inbound) && !bookingSubSteps.includes(session.step) && session.profile) {
    session.step = "view_bookings";
    session.draft.bookingList = null;
    await saveSession(phone, session);
    return showMyBookings(phone, session);
  }

  // Entry point
  if (session.step === "init") {
    if (wasExpired && !isGreeting(inbound)) await sendText(phone, t(session, "sessionExpired"));
    if (!session.lang) {
      session.step = "choose_lang";
      await saveSession(phone, session);
      return sendButtons(phone, MSG.en.chooseLang as string, [
        { id: "lang_en", title: "English" },
        { id: "lang_kn", title: "Kannada" },
      ]);
    }
    await sendText(phone, t(session, "welcome"));
    const profile = session.profile || (await findProfileByPhone(phone));
    if (profile) {
      session.profile = profile;
      return showMainMenu(phone, session);
    }
    session.step = "onboard_name";
    session.draft = { name: null, email: null };
    await saveSession(phone, session);
    return sendText(phone, t(session, "askName"));
  }

  const btnId = (ib: Inbound): string =>
    ib.kind === "button_reply" ? ib.id : ib.kind === "list_reply" ? ib.id : ib.kind === "text" ? ib.text.toLowerCase().trim() : "";

  switch (session.step) {
    case "choose_lang": {
      const id = btnId(inbound);
      session.lang = id === "lang_kn" || id === "kn" || id === "kannada" ? "kn" : "en";
      session.step = "init";
      await saveSession(phone, session);
      await sendText(phone, t(session, "welcome"));
      const profile = session.profile || (await findProfileByPhone(phone));
      if (profile) {
        session.profile = profile;
        return showMainMenu(phone, session);
      }
      session.step = "onboard_name";
      session.draft = { name: null, email: null };
      await saveSession(phone, session);
      return sendText(phone, t(session, "askName"));
    }

    case "onboard_name": {
      if (inbound.kind !== "text" || inbound.text.length < 2) return sendText(phone, t(session, "askName"));
      session.draft.name = inbound.text;
      session.step = "onboard_email";
      await saveSession(phone, session);
      return sendText(phone, t(session, "askEmail"));
    }

    case "onboard_email": {
      if (inbound.kind !== "text" || !EMAIL_RE.test(inbound.text)) return sendText(phone, t(session, "invalidEmail"));
      const profile = await createProfile({ phone, name: session.draft.name, email: inbound.text });
      session.profile = { ...profile, email: inbound.text.trim() };
      session.step = "main_menu";
      session.draft = {};
      await saveSession(phone, session);
      await sendText(phone, t(session, "profileCreated", profile.full_name));
      return showMainMenu(phone, session);
    }

    case "main_menu": {
      const id = btnId(inbound);
      if (id === "menu_book" || id === "1") {
        session.step = "categories";
        await saveSession(phone, session);
        return showCategories(phone, session);
      }
      if (id === "menu_bookings" || id === "2") {
        if (!session.profile) return showMainMenu(phone, session, true);
        session.step = "view_bookings";
        session.draft.bookingList = null;
        await saveSession(phone, session);
        return showMyBookings(phone, session);
      }
      if (id === "menu_help" || id === "3") {
        await sendText(phone, t(session, "helpText"));
        return showMainMenu(phone, session);
      }
      return showMainMenu(phone, session, true);
    }

    case "categories": {
      const choice = resolveChoice(inbound, session.draft.categories || []);
      if (!choice) return showCategories(phone, session, true);
      session.draft.category = choice;
      session.step = "services";
      await saveSession(phone, session);
      return showServices(phone, session);
    }

    case "services": {
      const choice = resolveChoice(inbound, session.draft.services || []);
      if (!choice) return showServices(phone, session, true);
      session.draft.service = choice;
      session.step = "providers";
      await saveSession(phone, session);
      return showProviders(phone, session);
    }

    case "providers": {
      const choice = resolveChoice(inbound, session.draft.providers || []);
      if (!choice) return showProviders(phone, session, true);
      session.draft.provider = choice;
      session.step = "provider_action";
      await saveSession(phone, session);
      return sendButtons(phone, t(session, "providerSummary", choice), [
        { id: "book_now", title: t(session, "btnBook") },
        { id: "view_details", title: t(session, "btnViewDetails") },
      ]);
    }

    case "provider_action": {
      const id = btnId(inbound);
      if (id === "view_details" || id === "2") {
        session.step = "provider_details";
        await saveSession(phone, session);
        const prov = session.draft.provider;
        if (prov.imageUrl) await sendImage(phone, prov.imageUrl, prov.businessName);
        return sendButtons(phone, t(session, "providerDetails", prov), [
          { id: "book_now", title: t(session, "btnBook") },
          { id: "back_to_providers", title: t(session, "btnBack") },
        ]);
      }
      if (id === "book_now" || id === "1") {
        session.step = "await_address";
        await saveSession(phone, session);
        return sendText(phone, t(session, "askAddress"));
      }
      return sendButtons(phone, t(session, "invalid"), [
        { id: "book_now", title: t(session, "btnBook") },
        { id: "view_details", title: t(session, "btnViewDetails") },
      ]);
    }

    case "provider_details": {
      const id = btnId(inbound);
      if (id === "book_now" || id === "1") {
        session.step = "await_address";
        await saveSession(phone, session);
        return sendText(phone, t(session, "askAddress"));
      }
      if (id === "back_to_providers") {
        session.step = "providers";
        await saveSession(phone, session);
        return showProviders(phone, session);
      }
      return sendButtons(phone, t(session, "invalid"), [
        { id: "book_now", title: t(session, "btnBook") },
        { id: "back_to_providers", title: t(session, "btnBack") },
      ]);
    }

    case "await_address": {
      if (inbound.kind !== "text" || inbound.text.length < 5) return sendText(phone, t(session, "askAddress"));
      session.draft.address = inbound.text;
      session.step = "await_date";
      await saveSession(phone, session);
      return sendText(phone, t(session, "askDate"));
    }

    case "await_date": {
      if (inbound.kind !== "text") return sendText(phone, t(session, "invalidDate"));
      const dateIso = parseDate(inbound.text);
      if (!dateIso) return sendText(phone, t(session, "invalidDate"));
      session.draft.bookingDate = dateIso;
      session.step = "await_time";
      await saveSession(phone, session);
      return sendText(phone, t(session, "askTime"));
    }

    case "await_time": {
      if (inbound.kind !== "text") return sendText(phone, t(session, "invalidTime"));
      const time24 = parseTime(inbound.text);
      if (!time24) return sendText(phone, t(session, "invalidTime"));
      session.draft.bookingTime = time24;
      session.step = "confirm_booking";
      await saveSession(phone, session);
      return sendButtons(
        phone,
        t(session, "confirmBooking", {
          service: session.draft.service.title,
          provider: session.draft.provider.businessName,
          date: prettyDate(session.draft.bookingDate),
          time: prettyTime(session.draft.bookingTime),
          price: session.draft.provider.price,
          address: session.draft.address,
        }),
        [
          { id: "confirm_yes", title: t(session, "btnConfirm") },
          { id: "confirm_no", title: t(session, "btnCancel") },
        ],
      );
    }

    case "confirm_booking": {
      const id = btnId(inbound);
      if (id === "confirm_no" || id === "2") {
        session.step = "main_menu";
        session.draft = {};
        await saveSession(phone, session);
        await sendText(phone, t(session, "cancelled"));
        return showMainMenu(phone, session);
      }
      if (id !== "confirm_yes" && id !== "1") {
        return sendButtons(phone, t(session, "invalid"), [
          { id: "confirm_yes", title: t(session, "btnConfirm") },
          { id: "confirm_no", title: t(session, "btnCancel") },
        ]);
      }
      try {
        const booking = await createBooking({
          customerId: session.profile.id,
          customerPhone: phone,
          customerName: session.profile.full_name,
          provider: session.draft.provider,
          service: session.draft.service,
          address: session.draft.address,
          bookingDate: session.draft.bookingDate,
          bookingTime: session.draft.bookingTime,
        });
        await sendText(
          phone,
          t(session, "bookingCreated", booking.booking_code, {
            service: session.draft.service.title,
            provider: session.draft.provider.businessName,
            date: prettyDate(session.draft.bookingDate),
            time: prettyTime(session.draft.bookingTime),
            email: (session.profile && session.profile.email) || session.draft.email || "",
          }),
        );
        await notifyProvider(session.draft.provider.providerId, booking.booking_code);
        await wait(5000);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[createBooking]", message);
        await sendText(phone, t(session, "bookingFailed"));
      }
      session.step = "main_menu";
      session.draft = {};
      await saveSession(phone, session);
      return showMainMenu(phone, session);
    }

    case "view_bookings": {
      const choice = resolveChoice(inbound, session.draft.bookingList || []);
      if (!choice) return showMyBookings(phone, session, true);
      session.draft.selectedBooking = choice;
      session.step = "booking_selected";
      await saveSession(phone, session);
      return showBookingDetail(phone, session);
    }

    case "booking_selected": {
      const id = btnId(inbound);
      if (id === "pay_booking") {
        const bk = session.draft.selectedBooking as BookingRow & { id: string };
        // ASSUMPTION: query params here are a guess — point this at whatever
        // route your site actually uses to resume payment for a booking.
        const payUrl = PAYMENT_WEBSITE + "?bookingId=" + encodeURIComponent(bk.id) + "&code=" + encodeURIComponent(bk.booking_code);
        await sendText(phone, t(session, "paymentLink", bk, payUrl));
        return showBookingDetail(phone, session);
      }
      if (id === "cancel_booking") {
        const bk = session.draft.selectedBooking as BookingRow;
        if (!["pending", "accepted"].includes(bk.status)) {
          await sendText(phone, t(session, "cannotCancel", bk.status));
          session.step = "view_bookings";
          await saveSession(phone, session);
          return showMyBookings(phone, session);
        }
        session.step = "cancel_confirm";
        await saveSession(phone, session);
        return sendButtons(phone, t(session, "confirmCancel"), [
          { id: "yes_cancel", title: t(session, "btnYes") },
          { id: "no_keep", title: t(session, "btnNo") },
        ]);
      }
      if (id === "back_to_bookings") {
        session.step = "view_bookings";
        await saveSession(phone, session);
        return showMyBookings(phone, session);
      }
      if (id === "ok_done") {
        session.step = "main_menu";
        session.draft = {};
        await saveSession(phone, session);
        return showMainMenu(phone, session);
      }
      return showBookingDetail(phone, session);
    }

    case "cancel_confirm": {
      const id = btnId(inbound);
      if (id === "yes_cancel" || id === "1") {
        const bk = session.draft.selectedBooking as BookingRow & { id: string };
        const result = await cancelBooking(bk.id, session.profile.id);
        await sendText(
          phone,
          result.success
            ? t(session, "cancelSuccess", result.bookingCode)
            : result.status
            ? t(session, "cannotCancel", result.status)
            : t(session, "cancelFailed"),
        );
        session.step = "main_menu";
        session.draft = {};
        await saveSession(phone, session);
        return showMainMenu(phone, session);
      }
      if (id === "no_keep" || id === "2") {
        session.step = "booking_selected";
        await saveSession(phone, session);
        return showBookingDetail(phone, session);
      }
      return sendButtons(phone, t(session, "confirmCancel"), [
        { id: "yes_cancel", title: t(session, "btnYes") },
        { id: "no_keep", title: t(session, "btnNo") },
      ]);
    }

    default: {
      session.step = "init";
      await saveSession(phone, session);
      if (session.profile && session.lang) return showMainMenu(phone, session);
      return sendText(phone, MSG.en.welcome as string);
    }
  }
}

/* ------------------------------------------------------------------ */
/* webhook handling                                                     */
/* ------------------------------------------------------------------ */

// deno-lint-ignore no-explicit-any
async function processInbound(body: any) {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message) return;
  if (await isDuplicateMessage(message.id)) {
    console.log("Duplicate ignored:", message.id);
    return;
  }
  const contact = value.contacts && value.contacts[0];
  const phone = message.from;
  const waName = (contact && contact.profile && contact.profile.name) || "Customer";
  const inbound = parseInbound(message);
  console.log("\nInbound from " + waName + " (" + phone + "):", inbound);
  try {
    await handleMessage({ phone, inbound });
  } catch (err) {
    console.error("Handler error:", err);
    await sendText(phone, MSG.en.genericError as string);
  }
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified");
      return new Response(challenge ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    let body: unknown;
    try {
      body = await req.json();
    } catch (err) {
      console.error("Bad JSON:", err instanceof Error ? err.message : err);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Respond immediately (WhatsApp expects a fast 200), then keep the
    // isolate alive long enough to finish processing via waitUntil.
    const processingPromise = processInbound(body).catch((err) => {
      console.error("processInbound:", err);
    });
    // deno-lint-ignore no-explicit-any
    const runtime = (globalThis as any).EdgeRuntime;
    if (runtime && typeof runtime.waitUntil === "function") {
      runtime.waitUntil(processingPromise);
    } else {
      // Local `supabase functions serve` doesn't provide EdgeRuntime —
      // await inline there so nothing gets dropped.
      await processingPromise;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
});