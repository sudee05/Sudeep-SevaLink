import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import {
  CalendarCheck,
  CheckCheck,
  Clock3,
  CreditCard,
  Heart,
  Image,
  MapPin,
  Paperclip,
  Send,
  Search,
  Sparkles,
  X,
  icons, CircleHelp
} from "lucide-react";
import {
  useBookingsQuery,
  useCategoriesQuery,
  useConversationByBookingQuery,
  useMessagesQuery,
  useNotificationsQuery,
  useProviderQuery,
  useProvidersByServiceQuery,
  useServicesQuery,
} from "@/hooks/use-queries";
import { useRealtimeConversation, useRealtimeNotifications } from "@/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingGrid } from "@/components/ui/loading-grid";
import { DataTable } from "@/components/common/data-table";
import { SectionHeader } from "@/components/common/section-header";
import { formatCurrency, formatDate } from "@/utils/format";
import { selectProfile, selectUser, setAuth, signOut } from "@/store/authSlice";
import {
  createBookingWithPayment,
  createBookingComplaint,
  createBookingFeedback,
  ensureConversationForBooking,
  getProviderFeedback,
  isBookingChatEnabled,
  markAllNotificationsRead,
  markConversationRead,
  markNotificationRead,
  sendMessage,
  updateBookingStatus,
  updateProfile,
  uploadChatAttachment,
} from "@/services/supabaseApi";
import { useToast } from "@/hooks/use-toast";
import { payWithRazorpay } from "../../lib/razorpay";
import { DatePicker } from "@/components/ui/datePicker";
import { TimePicker } from "@/components/ui/timePicker";

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

function bookingStatusVariant(status) {
  if (status === "completed") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

function getBookingPricing(provider) {
  const totalAmount = Number(provider?.price || provider?.starting_price || provider?.base_price || 0);
  const depositAmount = Math.max(1, Math.round(totalAmount * 0.15));
  const balanceAmount = Math.max(totalAmount - depositAmount, 0);
  return { totalAmount, depositAmount, balanceAmount };
}

function getTodayDateInputValue() {
  return new Date().toISOString().split("T")[0];
}

function BookingModal({
  bookingForm,
  bookingMutation,
  bookingProvider,
  isProcessingPayment,
  onClose,
  onSubmit,
  selectedService,
  setBookingForm,
}) {
  if (!bookingProvider) return null;

  const providerName = bookingProvider.business_name || bookingProvider.name || "Provider";
  const providerPrice = bookingProvider.price || bookingProvider.starting_price || bookingProvider.base_price;
  const minBookingDate = getTodayDateInputValue();
  const { totalAmount, depositAmount, balanceAmount } = getBookingPricing(bookingProvider);
  const hasFixedPrice = Number.isFinite(totalAmount) && totalAmount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">{selectedService?.name}</p>
            <h2 className="text-xl font-bold">Book {providerName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {Number(providerPrice || 0) ? formatCurrency(providerPrice) : "Price TBD"} |{" "}
              {bookingProvider.location || "Location not added"}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close booking form">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-foreground">Booking date</span>
            <DatePicker
              value={bookingForm.booking_date}
              min={minBookingDate}
              onChange={(date) => setBookingForm((form) => ({ ...form, booking_date: date }))}
            />
            <p className="text-xs text-muted-foreground">Choose today or a future date. Past dates are disabled.</p>
          </label>
          <label className="space-y-1 md:col-span-1">
            <span className="text-sm font-medium text-foreground">Booking time</span>
            <TimePicker
              value={bookingForm.booking_time}
              onChange={(time) => setBookingForm((form) => ({ ...form, booking_time: time }))}
            />
          </label>
          <Input
            required
            placeholder="Service address"
            className="md:col-span-2"
            value={bookingForm.address}
            onChange={(event) => setBookingForm((form) => ({ ...form, address: event.target.value }))}
          />
          <Textarea
            placeholder="Special instructions"
            className="md:col-span-2"
            value={bookingForm.notes}
            onChange={(event) => setBookingForm((form) => ({ ...form, notes: event.target.value }))}
          />
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm md:col-span-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <CreditCard className="h-4 w-4" />
              Payment summary
            </div>
            {hasFixedPrice ? (
              <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide">Total</p>
                  <p className="text-base font-semibold text-foreground">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide">Pay now</p>
                  <p className="text-base font-semibold text-foreground">{formatCurrency(depositAmount)}</p>
                  <p className="text-xs text-muted-foreground">15% booking deposit</p>
                </div>
                <div className="rounded-lg bg-card px-3 py-2">
                  <p className="text-xs uppercase tracking-wide">Pay later</p>
                  <p className="text-base font-semibold text-foreground">{formatCurrency(balanceAmount)}</p>
                  <p className="text-xs text-muted-foreground">Paid directly to the provider after service</p>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">
                This provider does not have a fixed price yet, so deposit payment is unavailable.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={bookingMutation.isPending || isProcessingPayment || !hasFixedPrice}>
              {isProcessingPayment ? "Opening payment..." : bookingMutation.isPending ? "Booking..." : "Pay 15% & Book"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BookingChatPanel({ booking, userId }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const chatEnabled = isBookingChatEnabled(booking?.status);
  const conversationQuery = useConversationByBookingQuery(booking?.id);
  const conversation = conversationQuery.data;
  const messagesQuery = useMessagesQuery(conversation?.id);
  const messages = messagesQuery.data || [];

  useRealtimeConversation(conversation?.id, userId);

  useEffect(() => {
    if (!chatEnabled || conversation || !booking?.id) return;
    ensureConversationForBooking(booking.id).then(() => {
      queryClient.invalidateQueries({ queryKey: ["conversation", "booking", booking.id] });
    });
  }, [booking?.id, chatEnabled, conversation, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!conversation?.id || !userId || !messages.length) return;
    markConversationRead(conversation.id, userId).then(() => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversation.id] });
    });
  }, [conversation?.id, messages.length, queryClient, userId]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!conversation?.id || !userId) return null;
      let uploaded = null;
      if (attachment) {
        uploaded = await uploadChatAttachment({ conversationId: conversation.id, file: attachment });
      }
      return sendMessage({
        conversationId: conversation.id,
        senderId: userId,
        message: message.trim(),
        attachmentUrl: uploaded?.url,
        attachmentPath: uploaded?.path,
        attachmentType: uploaded?.type,
      });
    },
    onSuccess: () => {
      setMessage("");
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["messages", conversation?.id] });
    },
  });

  function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim() && !attachment) return;
    sendMutation.mutate();
  }

  if (!chatEnabled) {
    return (
      <Card className="text-sm text-muted-foreground">Chat will be available after provider accepts the booking.</Card>
    );
  }

  return (
    <Card className="space-y-4">
      <SectionHeader title="Chat" subtitle="Realtime customer and provider messages for this booking." />
      <div className="h-80 space-y-3 overflow-y-auto rounded-xl border border-border bg-muted/20 p-3">
        {messagesQuery.isLoading || conversationQuery.isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading conversation...</p>
        ) : messages.length ? (
          messages.map((item) => {
            const mine = item.sender_id === userId;
            return (
              <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-white" : "bg-card border border-border"}`}>
                  {item.attachment_url && (
                    <a
                      href={item.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-2 block overflow-hidden rounded-xl border border-border/50">
                      {item.attachment_type?.startsWith("image/") ? (
                        <img src={item.attachment_url} alt="Chat attachment" className="max-h-56 w-full object-cover" />
                      ) : (
                        <span className="flex items-center gap-2 p-3">
                          <Paperclip className="h-4 w-4" /> Attachment
                        </span>
                      )}
                    </a>
                  )}
                  {item.message && <p>{item.message}</p>}
                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-white/75" : "text-muted-foreground"}`}>
                    {formatDate(item.created_at)}
                    {mine && item.is_read && <CheckCheck className="h-3 w-3" />}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => setAttachment(event.target.files?.[0] || null)}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image">
          <Image className="h-4 w-4" />
        </Button>
        <Input
          className="min-w-0 flex-1"
          placeholder="Type a message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button type="submit" disabled={sendMutation.isPending || (!message.trim() && !attachment)}>
          <Send className="h-4 w-4" />
          {sendMutation.isPending ? "Sending..." : "Send"}
        </Button>
        {attachment && <span className="w-full text-xs text-muted-foreground">{attachment.name}</span>}
      </form>
    </Card>
  );
}

export function CustomerDashboardPage() {
  const bookings = useBookingsQuery();
  const categories = useCategoriesQuery();
  const services = useServicesQuery();
  const profile = useSelector(selectProfile);
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [location, setLocation] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const providers = useProvidersByServiceQuery(selectedService?.id);

  const filteredServices = useMemo(() => {
    const byCategory =
      selectedCategoryId === "all"
        ? services.data || []
        : (services.data || []).filter((service) => String(service.category_id) === String(selectedCategoryId));
    if (!serviceSearch.trim()) return byCategory;
    const q = serviceSearch.toLowerCase();
    return byCategory.filter(
      (service) =>
        service.name?.toLowerCase().includes(q) ||
        service.description?.toLowerCase().includes(q),
    );
  }, [services.data, selectedCategoryId, serviceSearch]);

  const visibleProviders = useMemo(() => {
    const priceLimit = Number(maxPrice);
    return (providers.data || []).filter((provider) => {
      const matchesLocation = !location || (provider.location || "").toLowerCase().includes(location.toLowerCase());
      const providerPrice = Number(provider.price || provider.starting_price || provider.base_price || 0);
      const matchesPrice = !priceLimit || !providerPrice || providerPrice <= priceLimit;
      return matchesLocation && matchesPrice;
    });
  }, [providers.data, location, maxPrice]);

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ""}`}
        subtitle="Select a service, compare providers, and book the date and time when you need help."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-xs text-muted-foreground">Total Bookings</p>
          <p className="mt-2 text-2xl font-bold">{bookings.data?.length || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-bold">{bookings.data?.filter((b) => b.status === "pending").length || 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-bold">
            {bookings.data?.filter((b) => b.status === "completed").length || 0}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-muted-foreground">Available Services</p>
          <p className="mt-2 text-2xl font-bold">{services.data?.length || 0}</p>
        </Card>
      </div>

      <Card>
        <SectionHeader title="Choose a Service" subtitle="Start by selecting what you need." />

        {services.isLoading || categories.isLoading ? (
          <LoadingGrid count={3} />
        ) : selectedService ? (
          <div className="flex">
            <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-primary bg-primary/10 px-4 py-2 text-left shadow-sm ring-2 ring-primary/20">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-primary">{selectedService.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {selectedService.description || "Available service"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedService(null);
                  setSelectedCategoryId("all");
                  setBookingProvider(null);
                  setLocation("");
                  setMaxPrice("");
                }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Deselect service">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryId("all");
                  setSelectedService(null);
                  setBookingProvider(null);
                }}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${selectedCategoryId === "all" ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary"}`}>
                All
              </button>
              {(categories.data || []).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(category.id);
                    setSelectedService(null);
                    setBookingProvider(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${selectedCategoryId === category.id ? "border-primary bg-primary text-white" : "border-border bg-card text-foreground hover:border-primary"}`}>
                  {(() => { const Icon = icons[category.icon] ?? CircleHelp; return <Icon className="h-4 w-4" />; })()}
                  {category.name}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(service);
                    setBookingProvider(null);
                    setServiceSearch("");
                  }}
                  className=" flex justify-between rounded-xl border border-border p-4 text-left opacity-100 transition duration-200 hover:border-primary hover:shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {service.category_name || service.category?.name || "Category"}
                    </p>
                    <p className="font-semibold">{service.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {service.description || "Available service"}
                    </p>
                  </div>
                  <div>
                    {(() => { const Icon = icons[service.icon] ?? CircleHelp; return <Icon className="h-12 w-12" />; })()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {selectedService && (
        <Card className="space-y-4">
          <SectionHeader
            title={`Providers for ${selectedService.name}`}
            subtitle="Filter by location now; price filtering is ready for your future provider price column."
          />
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Filter by location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder="Max price"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setLocation("");
                setMaxPrice("");
              }}>
              Reset Filters
            </Button>
          </div>
          {providers.isLoading ? (
            <LoadingGrid count={3} />
          ) : visibleProviders.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleProviders.map((provider) => {
                const providerPrice = provider.price || provider.starting_price || provider.base_price;
                return (
                  <Card key={provider.id} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <div>

                          <h3 className="font-semibold">{provider.business_name || provider.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {provider.location || "Location not added"} | Rating {Number(provider.rating || 0).toFixed(1)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {provider.about || provider.description || "Provider details will appear here."}
                          </p>
                        </div>
                        <div>
                          <img src={provider.image_url} className="h-16 w-16 rounded-full" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold">
                        {Number(providerPrice || 0) ? formatCurrency(providerPrice) : "Price TBD"}
                      </p>
                      <div className='flex justify-end gap-2'>
                        <Button size="sm" className="rounded-lg" onClick={() => navigate(`/customer/provider-details/${provider.id}`)}>View Details</Button>
                        <Button size="sm" className="rounded-lg" onClick={() => navigate("/customer/book-provider", { state: { provider, service: selectedService } })}>Book</Button>
                      </div>

                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No providers found"
              description="If this service has an approved provider, update Supabase policies so customers can read provider_services and approved providers."
            />
          )}
        </Card>
      )}

    </motion.div>
  );
}

export function CustomerBookingsPage() {
  const { data = [] } = useBookingsQuery();

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader
        title="Booking History"
        subtitle="Track, reschedule, and manage bookings."
      />
      <DataTable
        columns={[
          { key: "booking_code", label: "Booking ID", render: (row) => row.booking_code || row.id },
          { key: "service", label: "Service" },
          { key: "date", label: "Needed On", render: (row) => formatDate(row.date) },
          {
            key: "status",
            label: "Status",
            render: (row) => <Badge variant={bookingStatusVariant(row.status)}>{row.status}</Badge>,
          },
          { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount) },
          {
            key: "action",
            label: "Action",
            render: (row) => (
              <Link to={`/customer/bookings/${row.id}`} className="font-semibold text-primary">
                View
              </Link>
            ),
          },
        ]}
        rows={data}
      />
    </motion.div>
  );
}

export function CustomerBookingDetailsPage() {
  const { id } = useParams();
  const { data = [] } = useBookingsQuery();
  const profile = useSelector(selectProfile);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ rating: "5", comment: "" });
  const [complaint, setComplaint] = useState({ subject: "", comment: "" });
  const booking = data.find((item) => item.id === id) || data[0];

  const feedbackMutation = useMutation({
    mutationFn: createBookingFeedback,
    onSuccess: () => {
      toast.success("Feedback submitted.");
      setFeedback({ rating: "5", comment: "" });
    },
    onError: (error) => toast.error(error.message || "Could not submit feedback"),
  });

  const complaintMutation = useMutation({
    mutationFn: createBookingComplaint,
    onSuccess: () => {
      toast.success("Complaint submitted.");
      setComplaint({ subject: "", comment: "" });
    },
    onError: (error) => toast.error(error.message || "Could not submit complaint"),
  });

  const statusMutation = useMutation({
    mutationFn: (status) => updateBookingStatus(booking.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking updated.");
    },
    onError: (error) => toast.error(error.message || "Could not update booking"),
  });

  if (!booking) return <EmptyState title="No booking found" />;

  function handleFeedbackSubmit(event) {
    event.preventDefault();
    feedbackMutation.mutate({
      booking_id: booking.id,
      provider_id: booking.provider_id,
      customer_id: profile.id,
      rating: Number(feedback.rating),
      comment: feedback.comment,
    });
  }

  function handleComplaintSubmit(event) {
    event.preventDefault();
    complaintMutation.mutate({
      booking_id: booking.id,
      provider_id: booking.provider_id,
      customer_id: profile.id,
      service_id: booking.service_id,
      subject: complaint.subject,
      comment: complaint.comment,
    });
  }

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title={`Booking ${booking.booking_code || booking.id}`}
        subtitle="Timeline, provider details, feedback and complaints."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="font-semibold">Booking Details</h3>
          <p className="text-sm text-muted-foreground">Service: {booking.service}</p>
          <p className="text-sm text-muted-foreground">Provider: {booking.provider}</p>
          <p className="text-sm text-muted-foreground">Needed on: {formatDate(booking.date)}</p>
          <p className="text-sm text-muted-foreground">Address: {booking.address}</p>
          <Badge variant={bookingStatusVariant(booking.status)}>{booking.status}</Badge>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-semibold">Actions</h3>
          {booking.status === "reschedule_requested" && (
            <>
              <Button
                className="w-full"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate("reschedule_accepted")}>
                Accept Reschedule
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate("reschedule_rejected")}>
                Reject Reschedule
              </Button>
            </>
          )}
          {!["completed", "cancelled", "rejected"].includes(booking.status) && (
            <Button
              variant="danger"
              className="w-full"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate("cancelled")}>
              Cancel Booking
            </Button>
          )}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Feedback</h3>
          <form className="space-y-3" onSubmit={handleFeedbackSubmit}>
            <Select
              value={feedback.rating}
              onChange={(event) => setFeedback((form) => ({ ...form, rating: event.target.value }))}
              options={[
                { label: "5 - Excellent", value: "5" },
                { label: "4 - Good", value: "4" },
                { label: "3 - Okay", value: "3" },
                { label: "2 - Poor", value: "2" },
                { label: "1 - Bad", value: "1" },
              ]}
            />
            <Textarea
              placeholder="Share feedback for the provider"
              value={feedback.comment}
              onChange={(event) => setFeedback((form) => ({ ...form, comment: event.target.value }))}
            />
            <Button type="submit" disabled={feedbackMutation.isPending}>
              {feedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Complaint</h3>
          <form className="space-y-3" onSubmit={handleComplaintSubmit}>
            <Input
              required
              placeholder="Subject"
              value={complaint.subject}
              onChange={(event) => setComplaint((form) => ({ ...form, subject: event.target.value }))}
            />
            <Textarea
              placeholder="Describe the issue"
              value={complaint.comment}
              onChange={(event) => setComplaint((form) => ({ ...form, comment: event.target.value }))}
            />
            <Button type="submit" variant="danger" disabled={complaintMutation.isPending}>
              {complaintMutation.isPending ? "Submitting..." : "Submit Complaint"}
            </Button>
          </form>
        </Card>
      </div>
      <BookingChatPanel booking={booking} userId={profile?.id} />
    </motion.div>
  );
}

export function CustomerNotificationsPage() {
  const profile = useSelector(selectProfile);
  const queryClient = useQueryClient();
  const notifications = useNotificationsQuery(profile?.id);

  useRealtimeNotifications(profile?.id);

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(profile.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", profile?.id] }),
  });

  const unreadCount = (notifications.data || []).filter((notification) => !notification.is_read).length;

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title="Notifications"
        subtitle="Realtime service, booking, approval, and chat alerts."
        action={
          unreadCount ? (
            <Button
              size="sm"
              variant="outline"
              disabled={markAllReadMutation.isPending}
              onClick={() => markAllReadMutation.mutate()}>
              Mark all read
            </Button>
          ) : null
        }
      />
      {notifications.isLoading ? (
        <LoadingGrid count={3} />
      ) : (notifications.data || []).length ? (
        <div className="space-y-3">
          {notifications.data.map((notification) => (
            <Card
              key={notification.id}
              className={`flex items-start justify-between gap-4 ${notification.is_read ? "opacity-70" : ""}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{notification.title}</h3>
                  {!notification.is_read && <Badge variant="secondary">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
              </div>
              {!notification.is_read && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={markReadMutation.isPending}
                  onClick={() => markReadMutation.mutate(notification.id)}>
                  Mark read
                </Button>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No notifications" description="Booking and approval updates will appear here." />
      )}
    </motion.div>
  );
}

export function CustomerProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const profile = useSelector(selectProfile);
  const user = useSelector(selectUser);
  const toast = useToast();
  const initialProfileForm = {
    full_name: profile?.full_name || "",
    email: user?.email || profile?.email || "",
    phone: profile?.phone || "",
    avatar_url: profile?.avatar_url || "",
  };

  const profileMutation = useMutation({
    mutationFn: (updates) => updateProfile(profile.id, updates),
    onSuccess: (updatedProfile) => {
      dispatch(setAuth({ user, profile: updatedProfile }));
      toast.success("Profile updated.");
    },
    onError: (error) => toast.error(error.message || "Could not update profile"),
  });

  async function handleLogout() {
    await dispatch(signOut());
    navigate("/login", { replace: true });
  }

  function handleProfileSubmit(formValues) {
    if (!profile?.id) return;

    profileMutation.mutate({
      full_name: formValues.full_name,
      phone: formValues.phone,
      avatar_url: formValues.avatar_url,
    });
  }

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Profile" subtitle="Manage your Supabase profile details and account session." />
      <ProfileFormCard
        key={profile?.id || user?.id || user?.email || "profile-form"}
        initialProfileForm={initialProfileForm}
        onLogout={handleLogout}
        onSubmitProfile={handleProfileSubmit}
        profileMutation={profileMutation}
      />
    </motion.div>
  );
}

function ProfileFormCard({ initialProfileForm, onLogout, onSubmitProfile, profileMutation }) {
  const [profileForm, setProfileForm] = useState(initialProfileForm);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmitProfile(profileForm);
  }

  return (
    <Card>
      <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <Input
          required
          placeholder="Full name"
          value={profileForm.full_name}
          onChange={(event) => setProfileForm((form) => ({ ...form, full_name: event.target.value }))}
        />
        <Input placeholder="Email" value={profileForm.email} disabled />
        <Input
          placeholder="Phone"
          value={profileForm.phone}
          onChange={(event) => setProfileForm((form) => ({ ...form, phone: event.target.value }))}
        />
        <Input
          placeholder="Avatar URL"
          value={profileForm.avatar_url}
          onChange={(event) => setProfileForm((form) => ({ ...form, avatar_url: event.target.value }))}
        />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit" disabled={profileMutation.isPending}>
            {profileMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
          <Button type="button" variant="outline" onClick={onLogout}>
            Logout
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function BookingPaymentPage() {
  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title="Payment" subtitle="Secure checkout with invoice support." />
      <Card className="space-y-3">
        <Select
          placeholder="Payment Method"
          options={[
            { label: "UPI", value: "upi" },
            { label: "Card", value: "card" },
          ]}
        />
        <Input placeholder="Card or UPI ID" />
        <div className="flex gap-2">
          <Link to="/customer/booking/success" className="flex-1">
            <Button className="w-full">
              <CreditCard className="h-4 w-4" /> Pay Now
            </Button>
          </Link>
          <Link to="/customer/booking/failed" className="flex-1">
            <Button variant="outline" className="w-full">
              Simulate Failure
            </Button>
          </Link>
        </div>
      </Card>
    </motion.div>
  );
}

export function BookingSuccessPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <Card className="text-center">
        <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-secondary" />
        <h2 className="text-2xl font-bold">Booking Confirmed</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your service is successfully booked and provider is notified.
        </p>
        <Link to="/customer/bookings">
          <Button className="mt-4">View Bookings</Button>
        </Link>
      </Card>
    </motion.div>
  );
}

export function BookingFailedPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <Card className="text-center">
        <Clock3 className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <h2 className="text-2xl font-bold">Payment Failed</h2>
        <p className="mt-2 text-sm text-muted-foreground">There was an issue processing your payment.</p>
        <Link to="/customer">
          <Button className="mt-4">Try Again</Button>
        </Link>
      </Card>
    </motion.div>
  );
}

export function BookingTrackingPage() {
  const { id } = useParams();

  return (
    <motion.div className="space-y-5" {...fade}>
      <SectionHeader title={`Tracking ${id}`} subtitle="Live updates from provider and platform." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2 text-sm text-muted-foreground">
          <p className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Booking confirmed
          </p>
          <p className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Provider on the way
          </p>
          <p className="inline-flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Estimated arrival in 25 mins
          </p>
        </Card>
        <Card>
          <h3 className="font-semibold">Provider Contact</h3>
          <p className="mt-2 text-sm text-muted-foreground">Provider details appear after assignment.</p>
          <Button className="mt-4">Call Provider</Button>
        </Card>
      </div>
    </motion.div>
  );
}

export function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: provider, isLoading, error } = useProviderQuery(id);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    if (!id) return;
    getProviderFeedback(id).then(setFeedback).catch(() => { });
  }, [id]);

  if (isLoading) return <LoadingGrid count={3} />;
  if (error || !provider)
    return (
      <motion.div className="space-y-4" {...fade}>
        <SectionHeader title="Provider Details" subtitle="Could not load provider information." />
        <Card>
          <p className="text-sm text-muted-foreground">Provider not found or an error occurred.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </motion.div>
    );

  const rating = Number(provider.rating || 0);
  const services = provider.services || [];
  const certificates = Array.isArray(provider.certificates) ? provider.certificates : [];

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Provider Details" subtitle="View provider details and book a service." />

      {/* Hero card */}
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="shrink-0">
            {provider.image_url ? (
              <img
                src={provider.image_url}
                alt={provider.business_name}
                className="h-28 w-28 rounded-2xl object-cover ring-2 ring-primary/20"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-primary/10 text-3xl font-bold text-primary">
                {(provider.business_name || "P")[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold">{provider.business_name || provider.name}</h2>
                {provider.location && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {provider.location}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                ★ {rating.toFixed(1)}
                <span className="font-normal text-muted-foreground">/ 5</span>
              </div>
            </div>

            {provider.experience && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Experience:</span> {provider.experience}
              </p>
            )}

            {provider.about && (
              <p className="text-sm text-muted-foreground">{provider.about}</p>
            )}

            {certificates.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {certificates.map((cert, i) => (
                  <span key={i} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-0.5 text-xs font-medium text-primary">
                    {cert}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Services offered */}
      {services.length > 0 && (
        <Card className="space-y-3">
          <h3 className="font-semibold">Services Offered</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((svc) => (
              <div key={svc.id || svc.name} className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{svc.service_name || svc.name}</p>
                  {svc.description && <p className="mt-0.5 text-xs text-muted-foreground">{svc.description}</p>}
                </div>
                {svc.price > 0 && (
                  <span className="shrink-0 text-sm font-semibold text-primary">{formatCurrency(svc.price)}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Customer reviews */}
      <Card className="space-y-4">
        <h3 className="font-semibold">Customer Reviews</h3>
        {feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-xl border border-border p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{item.profiles?.full_name || "Customer"}</p>
                  <span className="text-xs text-amber-500 font-semibold">★ {item.rating ?? "-"}</span>
                </div>
                {item.comment && <p className="text-sm text-muted-foreground">{item.comment}</p>}
                {item.bookings?.service_title && (
                  <p className="text-xs text-muted-foreground">Service: {item.bookings.service_title}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button className="rounded-lg" onClick={() => navigate("/customer/book-provider", { state: { provider } })}>
          Book Now
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>← Go Back</Button>
      </div>
    </motion.div>
  );
}

export function BookProviderPage() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const profile = useSelector(selectProfile);

  const bookingProvider = state?.provider ?? null;
  const selectedService = state?.service ?? null;

  const [bookingForm, setBookingForm] = useState({ booking_date: "", booking_time: "", address: "", notes: "" });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const bookingMutation = useMutation({
    mutationFn: createBookingWithPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking confirmed!");
      navigate("/customer/bookings");
    },
    onError: (error) => toast.error(error.message || "Could not create booking"),
  });

  if (!bookingProvider) {
    return (
      <motion.div className="space-y-4" {...fade}>
        <SectionHeader title="Book a Provider" subtitle="No provider selected." />
        <Card>
          <p className="text-sm text-muted-foreground">Please go back and select a provider to book.</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
        </Card>
      </motion.div>
    );
  }

  const providerName = bookingProvider.business_name || bookingProvider.name || "Provider";
  const providerPrice = bookingProvider.price || bookingProvider.starting_price || bookingProvider.base_price;
  const { totalAmount, depositAmount, balanceAmount } = getBookingPricing(bookingProvider);
  const hasFixedPrice = Number.isFinite(totalAmount) && totalAmount > 0;
  const minBookingDate = getTodayDateInputValue();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!profile?.id || !bookingProvider) return;
    if (!hasFixedPrice) {
      toast.error("This provider does not have a fixed price yet.");
      return;
    }
    setIsProcessingPayment(true);
    try {
      const payment = await payWithRazorpay({
        amount: depositAmount,
        name: "SevaLink booking deposit",
        description: `${selectedService?.name ?? "Service"} booking for ${providerName}`,
        notes: {
          booking_type: "service_booking_deposit",
          service_title: selectedService?.name ?? "",
          provider_name: providerName,
          customer_name: profile.full_name || "",
          deposit_amount: String(depositAmount),
          balance_amount: String(balanceAmount),
        },
        prefill: {
          name: profile.full_name || "",
          email: profile.email || "",
          contact: profile.phone || "",
        },
        theme: { color: "#0f766e" },
      });

      await bookingMutation.mutateAsync({
        booking: {
          customer_id: profile.id,
          provider_id: bookingProvider.id,
          service_id: selectedService?.id ?? null,
          service_title: selectedService?.name ?? "",
          provider_name: providerName,
          customer_name: profile.full_name || "",
          booking_date: bookingForm.booking_date,
          booking_time: bookingForm.booking_time,
          address: bookingForm.address,
          notes: bookingForm.notes,
          amount: totalAmount,
        },
        payment: {
          booking_id: null,
          razorpay_payment_id: payment?.razorpay_payment_id || "",
          razorpay_order_id: payment?.razorpay_order_id || "",
          razorpay_signature: payment?.razorpay_signature || "",
          amount: depositAmount,
          currency: "INR",
          status: "captured",
          payment_method: "razorpay",
          payment_metadata: {
            service_title: selectedService?.name ?? "",
            provider_name: providerName,
            customer_name: profile.full_name || "",
            deposit_amount: String(depositAmount),
            balance_amount: String(balanceAmount),
          },
        },
      });
    } catch (error) {
      toast.error(error.message || "Could not complete payment");
    } finally {
      setIsProcessingPayment(false);
    }
  }

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader
        title={`Book ${providerName}`}
        subtitle={selectedService ? `Booking for: ${selectedService.name}` : "Complete your booking details below."}
      />

      <Card>
        {/* Provider summary */}
        <div className="mb-6 flex items-start gap-4">
          {bookingProvider.image_url ? (
            <img src={bookingProvider.image_url} alt={providerName} className="h-16 w-16 rounded-2xl object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
              {providerName[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold">{providerName}</h2>
            <p className="text-sm text-muted-foreground">
              {Number(providerPrice || 0) ? formatCurrency(providerPrice) : "Price TBD"} &nbsp;|&nbsp;
              {bookingProvider.location || "Location not added"}
            </p>
            {selectedService && <p className="text-sm font-medium text-primary">{selectedService.name}</p>}
          </div>
        </div>

        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-1">
            <span className="text-sm font-medium">Booking date</span>
            <DatePicker value={bookingForm.booking_date} min={minBookingDate} onChange={(date) => setBookingForm((f) => ({ ...f, booking_date: date }))} />
            <p className="text-xs text-muted-foreground">Choose today or a future date.</p>
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Booking time</span>
            <TimePicker value={bookingForm.booking_time} onChange={(time) => setBookingForm((f) => ({ ...f, booking_time: time }))} />
          </label>
          <Input required placeholder="Service address" className="md:col-span-2" value={bookingForm.address} onChange={(e) => setBookingForm((f) => ({ ...f, address: e.target.value }))} />
          <Textarea placeholder="Special instructions" className="md:col-span-2" value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} />

          {/* Payment summary */}
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm md:col-span-2">
            <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4" /> Payment summary</div>
            {hasFixedPrice ? (
              <div className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-3">
                <div className="rounded-lg bg-card px-3 py-2"><p className="text-xs uppercase tracking-wide">Total</p><p className="text-base font-semibold text-foreground">{formatCurrency(totalAmount)}</p></div>
                <div className="rounded-lg bg-card px-3 py-2"><p className="text-xs uppercase tracking-wide">Pay now</p><p className="text-base font-semibold text-foreground">{formatCurrency(depositAmount)}</p><p className="text-xs">15% deposit</p></div>
                <div className="rounded-lg bg-card px-3 py-2"><p className="text-xs uppercase tracking-wide">Pay later</p><p className="text-base font-semibold text-foreground">{formatCurrency(balanceAmount)}</p><p className="text-xs">After service</p></div>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">This provider does not have a fixed price yet.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={bookingMutation.isPending || isProcessingPayment || !hasFixedPrice}>
              {isProcessingPayment ? "Opening payment..." : bookingMutation.isPending ? "Booking..." : "Pay 15% & Book"}
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}
