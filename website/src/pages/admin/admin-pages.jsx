import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useAdminPendingItemsQuery, useAdminStatsQuery, useBookingsQuery, useCategoriesQuery } from "@/hooks/use-queries";
import { BookingBarChart, RevenueAreaChart } from "@/components/charts/revenue-booking-chart";
import { DataTable } from "@/components/common/data-table";
import { SectionHeader } from "@/components/common/section-header";
import { StatCard } from "@/components/common/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingGrid } from "@/components/ui/loading-grid";
import {
  fetchAdminSection,
  selectAdminSection,
  createAdminRow,
  updateAdminRow,
  deleteAdminRow,
  resetSection,
} from "@/store/adminSlice";
import { formatCurrency, formatDate } from "@/utils/format";
import { supabase } from "@/lib/supabase";
import { Bell, CheckCircle2, Clock, Pencil, Trash2, Plus, ShieldCheck, Wrench, X } from "lucide-react";

const fade = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

// ── Modal ─────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}>
        <motion.div
          className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button onClick={onClose} className="rounded-xl p-1 transition hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Service Form ──────────────────────────────────────────────

const EMPTY_SERVICE = { name: "", description: "", category_id: "" };

function ServiceForm({ initial = EMPTY_SERVICE, categories = [], onSubmit, loading }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        onSubmit({
          name: form.name.trim(),
          description: form.description.trim(),
          category_id: form.category_id || null,
        });
      }}
      className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Service Name</label>
        <Input
          required
          placeholder="e.g. Home Cleaning"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          className="h-24 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Describe the service..."
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Category</label>
        <Select
          value={form.category_id}
          onChange={(e) => set("category_id", e.target.value)}
          placeholder="Select category"
          options={categories.map((category) => ({ label: category.name, value: category.id }))}
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={loading || !form.name.trim()}>
          {loading ? "Saving…" : "Save Service"}
        </Button>
      </div>
    </form>
  );
}

// ── Admin Dashboard ───────────────────────────────────────────

export function AdminDashboardPage() {
  const stats = useAdminStatsQuery();
  const bookings = useBookingsQuery();

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader title="Admin Home" subtitle="Revenue, bookings, providers and operational activity." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.data?.cards?.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.label === "Revenue" ? formatCurrency(card.value) : card.value}
            delta={card.delta}
          />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart data={stats.data?.trends || []} />
        <BookingBarChart data={stats.data?.trends || []} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <SectionHeader title="Latest Bookings" subtitle="Newest activity in marketplace." />
          <DataTable
            columns={[
              { key: "id", label: "ID", render: (row) => (row.booking_code || row.id || "").toString().slice(0, 8) },
              { key: "service_title", label: "Service", render: (row) => row.service_title || "-" },
              { key: "customer_name", label: "Customer", render: (row) => row.customer_name || "-" },
              { key: "amount", label: "Amount", render: (row) => formatCurrency(row.amount || 0) },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <Badge variant={row.status === "completed" ? "success" : "warning"}>{row.status}</Badge>
                ),
              },
            ]}
            rows={(bookings.data || []).slice(0, 5)}
          />
        </Card>
        <Card>
          <SectionHeader title="Recent Activities" subtitle="Internal operations timeline." />
          <div className="space-y-3 text-sm text-muted-foreground">
            {(stats.data?.latestActivities || []).map((item) => (
              <div key={item} className="rounded-xl border border-border p-3">
                {item}
              </div>
            ))}
            {!stats.data?.latestActivities?.length && (
              <p className="py-4 text-center text-sm text-muted-foreground">No recent activity.</p>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

// ── Admin Users ───────────────────────────────────────────────

export function AdminUsersPage() {
  return <AdminSectionPage sectionOverride="users" />;
}

// ── Admin Providers ───────────────────────────────────────────

export function AdminProvidersPage() {
  const dispatch = useDispatch();
  const { rows, status, error } = useSelector(selectAdminSection("providers"));
  const [actionId, setActionId] = useState(null); // id of provider being actioned
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);

  useEffect(() => {
    if (status === "idle") dispatch(fetchAdminSection("providers"));
  }, [dispatch, status]);

  const visibleRows = useMemo(() => {
    let r = rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          (x.business_name || "").toLowerCase().includes(q) ||
          (x.owner_name || "").toLowerCase().includes(q) ||
          (x.owner_phone || "").toLowerCase().includes(q) ||
          (x.services_label || "").toLowerCase().includes(q),
      );
    }
    if (filterStatus) r = r.filter((x) => (x.approval_status || "pending") === filterStatus);
    return r;
  }, [rows, search, filterStatus]);

  async function handleApproval(row, newStatus) {
    // row.id = profile UUID (we now query from profiles table)
    // row.provider_record_id = providers table UUID (may be null if no biz profile)
    setActionId(row.id);
    try {
      await supabase.from("profiles").update({ approval_status: newStatus }).eq("id", row.id);

      if (row.provider_record_id) {
        const providerStatus = newStatus === "approved" ? "approved" : newStatus === "denied" ? "rejected" : "pending";
        await supabase
          .from("providers")
          .update({ verified: newStatus === "approved", status: providerStatus })
          .eq("id", row.provider_record_id);
      }

      // Reset section to idle → triggers fresh re-fetch
      dispatch(resetSection("providers"));
      dispatch(fetchAdminSection("providers"));
    } catch (e) {
      console.error("Approval update failed:", e);
    } finally {
      setActionId(null);
    }
  }

  const approvalVariant = (s) => (s === "approved" ? "success" : s === "denied" ? "danger" : "warning");

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Provider Management" subtitle="Review provider registrations and approve or deny access." />

      {/* Filters */}
      <Card className="grid gap-3 md:grid-cols-4">
        <Input
          className="md:col-span-2"
          placeholder="Search by name or business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All statuses"
          options={[
            { label: "Pending", value: "pending" },
            { label: "Approved", value: "approved" },
            { label: "Denied", value: "denied" },
          ]}
        />
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFilterStatus("");
          }}>
          Reset
        </Button>
      </Card>

      {/* Table */}
      {status === "loading" ? (
        <LoadingGrid count={3} />
      ) : status === "failed" ? (
        <ErrorState description={error} onRetry={() => dispatch(fetchAdminSection("providers"))} />
      ) : visibleRows.length ? (
        <DataTable
          columns={[
            { key: "business_name", label: "Business Name", render: (row) => row.business_name || "-" },
            { key: "owner_name", label: "Owner", render: (row) => row.owner_name || row.profiles?.full_name || "-" },
            {
              key: "services",
              label: "Services",
              render: (row) => row.service_names?.[0]?.name || row.service_names?.[0] || row.services_label || "-",
            },
            { key: "location", label: "Location", render: (row) => row.location || "-" },
            { key: "rating", label: "Rating", render: (row) => Number(row.rating || 0).toFixed(1) },
            {
              key: "approval_status",
              label: "Status",
              render: (row) => {
                const s = row.approval_status || "pending";
                return <Badge variant={approvalVariant(s)}>{s.charAt(0).toUpperCase() + s.slice(1)}</Badge>;
              },
            },
            {
              key: "action",
              label: "Actions",
              render: (row) => {
                const busy = actionId === row.id;
                const s = row.approval_status || "pending";
                return (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setSelectedProvider(row)}>
                      View Details
                    </Button>
                    {s !== "approved" && (
                      <Button size="sm" disabled={busy} onClick={() => handleApproval(row, "approved")}>
                        {busy ? "…" : "Approve"}
                      </Button>
                    )}
                    {s !== "denied" && (
                      <Button size="sm" variant="danger" disabled={busy} onClick={() => handleApproval(row, "denied")}>
                        {busy ? "…" : "Deny"}
                      </Button>
                    )}
                    {s !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleApproval(row, "pending")}>
                        Reset
                      </Button>
                    )}
                  </div>
                );
              },
            },
          ]}
          rows={visibleRows}
        />
      ) : (
        <EmptyState title="No providers found" />
      )}

      <Modal
        open={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
        title={selectedProvider?.business_name || "Provider Details"}>
        {selectedProvider && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Owner</p>
                <p className="font-medium">{selectedProvider.owner_name || "-"}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium">{selectedProvider.owner_phone || "-"}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium">{selectedProvider.location || "-"}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="font-medium">{Number(selectedProvider.rating || 0).toFixed(1)}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Profile Status</p>
                <Badge variant={approvalVariant(selectedProvider.approval_status || "pending")}>
                  {selectedProvider.approval_status || "pending"}
                </Badge>
              </div>
              <div className="rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Provider Status</p>
                <Badge variant={selectedProvider.verified ? "success" : "warning"}>
                  {selectedProvider.status || (selectedProvider.verified ? "approved" : "pending")}
                </Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Services</p>
              <p className="font-medium">{selectedProvider.services_label || "-"}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Provider Record ID</p>
              <p className="break-all font-mono text-xs">{selectedProvider.provider_record_id || "-"}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Profile ID</p>
              <p className="break-all font-mono text-xs">{selectedProvider.profile_id || selectedProvider.id}</p>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}

// \u2500\u2500 Admin Services (master catalog CRUD + service requests) \u2500\u2500\u2500\u2500\u2500

export function AdminServicesPage() {
  const dispatch = useDispatch();
  const categoriesQuery = useCategoriesQuery();
  const { rows, status, error } = useSelector(selectAdminSection("services"));
  const [tab, setTab] = useState("catalog"); // 'catalog' | 'requests'
  const [requests, setRequests] = useState([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (status === "idle") dispatch(fetchAdminSection("services"));
  }, [dispatch, status]);

  const loadRequests = useCallback(async () => {
    setReqLoading(true);
    try {
      const { data } = await supabase
        .from("service_requests")
        .select("*, profiles(full_name), providers(business_name), categories(name)")
        .order("created_at", { ascending: false });
      setRequests(data || []);
    } finally {
      setReqLoading(false);
    }
  }, []);

  const visibleRows = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (x) =>
        (x.name || "").toLowerCase().includes(q) ||
        (x.description || "").toLowerCase().includes(q) ||
        (x.category?.name || x.category_name || "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  async function handleCreate(payload) {
    setActionLoading(true);
    await dispatch(createAdminRow({ section: "services", payload }));
    setActionLoading(false);
    setShowAdd(false);
  }

  async function handleUpdate(payload) {
    const rowId = editRow?.id;
    if (!rowId) return;
    setActionLoading(true);
    await dispatch(updateAdminRow({ section: "services", id: rowId, payload }));
    setActionLoading(false);
    setEditRow(null);
  }

  async function handleDelete(id) {
    setActionLoading(true);
    await dispatch(deleteAdminRow({ section: "services", id }));
    setActionLoading(false);
    setDeleteConfirm(null);
  }

  async function handleRequest(req, action) {
    setReqLoading(true);
    try {
      if (action === "approve") {
        // Add to master catalog
        await supabase.from("services").insert({
          name: req.service_name || req.name,
          description: req.description || "",
          category_id: req.category_id || null,
        });
      }
      // Update request status
      await supabase
        .from("service_requests")
        .update({ status: action === "approve" ? "approved" : "denied" })
        .eq("id", req.id);
      // Refresh
      dispatch(resetSection("services"));
      dispatch(fetchAdminSection("services"));
      await loadRequests();
    } finally {
      setReqLoading(false);
    }
  }

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title="Service Catalog"
        subtitle="Manage the master list of service types available on the platform."
        action={
          tab === "catalog" ? (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1 w-fit">
        {["catalog", "requests"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              if (t === "requests") loadRequests();
            }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-card text-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}>
            {t === "catalog" ? "Service Catalog" : "Requests"}
          </button>
        ))}
      </div>

      {tab === "catalog" && (
        <>
          {/* Search */}
          <Card className="flex gap-3">
            <Input
              className="flex-1"
              placeholder="Search services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="outline" onClick={() => setSearch("")}>
              Reset
            </Button>
          </Card>

          {status === "loading" ? (
            <LoadingGrid count={3} />
          ) : status === "failed" ? (
            <ErrorState description={error} onRetry={() => dispatch(fetchAdminSection("services"))} />
          ) : visibleRows.length ? (
            <DataTable
              columns={[
                {
                  key: "name",
                  label: "Service Name",
                  render: (row) => <span className="font-medium">{row.name}</span>,
                },
                {
                  key: "category",
                  label: "Category",
                  render: (row) => (
                    <span className="text-muted-foreground">{row.category?.name || row.category_name || "-"}</span>
                  ),
                },
                {
                  key: "description",
                  label: "Description",
                  render: (row) => (
                    <span className="max-w-xs truncate text-muted-foreground">{row.description || "-"}</span>
                  ),
                },
                {
                  key: "action",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setEditRow(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              rows={visibleRows}
            />
          ) : (
            <EmptyState title="No services in catalog" />
          )}
        </>
      )}

      {tab === "requests" &&
        (reqLoading ? (
          <LoadingGrid count={2} />
        ) : requests.length ? (
          <DataTable
            columns={[
              {
                key: "service_name",
                label: "Requested Service",
                render: (r) => <span className="font-medium">{r.service_name || r.name}</span>,
              },
              {
                key: "category",
                label: "Category",
                render: (r) => <span className="text-muted-foreground">{r.categories?.name || "-"}</span>,
              },
              { key: "description", label: "Description", render: (r) => r.description || "-" },
              {
                key: "provider",
                label: "Requested By",
                render: (r) => r.providers?.business_name || r.profiles?.full_name || "-",
              },
              { key: "phone", label: "Phone", render: (r) => r.phone || "-" },
              { key: "created_at", label: "Date", render: (r) => formatDate(r.created_at) },
              {
                key: "status",
                label: "Status",
                render: (r) => {
                  const v = r.status === "approved" ? "success" : r.status === "denied" ? "danger" : "warning";
                  return <Badge variant={v}>{r.status}</Badge>;
                },
              },
              {
                key: "action",
                label: "Actions",
                render: (r) =>
                  r.status === "pending" ? (
                    <div className="flex gap-1">
                      <Button size="sm" disabled={reqLoading} onClick={() => handleRequest(r, "approve")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" disabled={reqLoading} onClick={() => handleRequest(r, "deny")}>
                        Deny
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                  ),
              },
            ]}
            rows={requests}
          />
        ) : (
          <EmptyState title="No service requests" />
        ))}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Service">
        <ServiceForm categories={categoriesQuery.data || []} loading={actionLoading} onSubmit={handleCreate} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title="Edit Service">
        {editRow && (
          <ServiceForm
            key={editRow.id}
            initial={{
              name: editRow.name || "",
              description: editRow.description || "",
              category_id: editRow.category_id || editRow.category?.id || "",
            }}
            categories={categoriesQuery.data || []}
            loading={actionLoading}
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Service">
        <p className="mb-6 text-sm text-muted-foreground">
          Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirm?.name}"</span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={actionLoading} onClick={() => handleDelete(deleteConfirm?.id)}>
            {actionLoading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </motion.div>
  );
}

// ── Admin Bookings (with payment details) ─────────────────────

export function AdminBookingsPage() {
  const dispatch = useDispatch();
  const { rows, status, error } = useSelector(selectAdminSection("bookings"));
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (status === "idle") dispatch(fetchAdminSection("bookings"));
  }, [dispatch, status]);

  const visibleRows = useMemo(() => {
    let r = rows;
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          (x.booking_code || x.id || "").toString().toLowerCase().includes(q) ||
          (x.customer_name || "").toLowerCase().includes(q) ||
          (x.service_title || "").toLowerCase().includes(q) ||
          (x.provider_name || "").toLowerCase().includes(q),
      );
    }
    if (filterStatus) r = r.filter((x) => x.status === filterStatus);
    return r;
  }, [rows, search, filterStatus]);

  const statusOptions = useMemo(() => {
    const unique = [...new Set(rows.map((r) => r.status).filter(Boolean))];
    return unique.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }));
  }, [rows]);

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader
        title="Booking Management"
        subtitle="All bookings with customer, provider, service, and payment details."
      />

      {/* Filters */}
      <Card className="grid gap-3 md:grid-cols-4">
        <Input
          className="md:col-span-2"
          placeholder="Search by booking ID, customer, service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          placeholder="All statuses"
          options={statusOptions}
        />
        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setFilterStatus("");
          }}>
          Reset
        </Button>
      </Card>

      {/* Table */}
      {status === "loading" ? (
        <LoadingGrid count={3} />
      ) : status === "failed" ? (
        <ErrorState description={error} onRetry={() => dispatch(fetchAdminSection("bookings"))} />
      ) : visibleRows.length ? (
        <DataTable
          columns={[
            {
              key: "booking_code",
              label: "Booking #",
              render: (row) => (
                <span className="font-mono text-xs font-semibold">
                  {(row.booking_code || row.id || "").toString().slice(0, 10)}
                </span>
              ),
            },
            { key: "service_title", label: "Service", render: (row) => row.service_title || "-" },
            { key: "customer_name", label: "Customer", render: (row) => row.customer_name || "-" },
            { key: "provider_name", label: "Provider", render: (row) => row.provider_name || "-" },
            { key: "scheduled_date", label: "Date", render: (row) => formatDate(row.scheduled_date || row.created_at) },
            {
              key: "status",
              label: "Status",
              render: (row) => {
                const variant =
                  row.status === "completed" ? "success" : row.status === "cancelled" ? "danger" : "warning";
                return <Badge variant={variant}>{row.status}</Badge>;
              },
            },
            // ── Payment details ──
            {
              key: "amount",
              label: "Amount",
              render: (row) => <span className="font-semibold">{formatCurrency(row.amount || 0)}</span>,
            },
            {
              key: "payment_status",
              label: "Payment",
              render: (row) => {
                const ps = row.payment_status || (row.status === "completed" ? "paid" : "pending");
                const variant = ps === "paid" ? "success" : ps === "deposit_paid" ? "warning" : "warning";
                return <Badge variant={variant}>{ps === "deposit_paid" ? "deposit paid" : ps}</Badge>;
              },
            },
            {
              key: "action",
              label: "Action",
              render: () => (
                <Button size="sm" variant="outline">
                  View
                </Button>
              ),
            },
          ]}
          rows={visibleRows}
        />
      ) : (
        <EmptyState title="No bookings found" />
      )}
    </motion.div>
  );
}

// ── Admin Reports ─────────────────────────────────────────────

export function AdminReportsPage() {
  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title="Reports" subtitle="Growth, revenue, categories, providers and customer insights." />
      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueAreaChart
          data={[
            { month: "Jan", revenue: 920000, bookings: 2800 },
            { month: "Feb", revenue: 1000000, bookings: 2950 },
            { month: "Mar", revenue: 1110000, bookings: 3210 },
            { month: "Apr", revenue: 1190000, bookings: 3550 },
            { month: "May", revenue: 1280000, bookings: 3780 },
            { month: "Jun", revenue: 1360000, bookings: 3980 },
          ]}
        />
        <Card className="space-y-2">
          <h3 className="font-semibold">Top Insights</h3>
          <p className="text-sm text-muted-foreground">Cleaning services grew 22% MoM.</p>
          <p className="text-sm text-muted-foreground">Provider acceptance SLA improved by 17%.</p>
          <p className="text-sm text-muted-foreground">Customer repeat bookings crossed 63%.</p>
        </Card>
      </div>
    </motion.div>
  );
}

// ── Generic Section Page ──────────────────────────────────────

const sectionConfig = {
  users: {
    title: "Users",
    subtitle: "Customer, provider, and admin account administration.",
    action: "New User",
    columns: [
      { key: "full_name", label: "Name", render: (row) => row.full_name || "Unnamed user" },
      { key: "phone", label: "Phone", render: (row) => row.phone || "-" },
      { key: "role", label: "Role", render: (row) => <Badge>{row.role}</Badge> },
      { key: "created_at", label: "Joined", render: (row) => formatDate(row.created_at) },
    ],
  },
  providers: {
    title: "Providers",
    subtitle: "Verification, quality, and operational status.",
    action: "Request Changes",
    columns: [
      { key: "business_name", label: "Provider" },
      { key: "services", label: "Services", render: (row) => row.services_label || "-" },
      { key: "location", label: "Location", render: (row) => row.location || "-" },
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Badge variant={row.verified ? "success" : "warning"}>
            {row.status || (row.verified ? "approved" : "pending")}
          </Badge>
        ),
      },
      { key: "rating", label: "Rating", render: (row) => Number(row.rating || 0).toFixed(1) },
    ],
  },
  complaints: {
    title: "Complaints",
    subtitle: "Review escalations, quality issues, and resolution timelines.",
    action: "Assign",
    columns: [
      { key: "booking", label: "Booking", render: (row) => row.bookings?.booking_code || row.booking_id },
      { key: "subject", label: "Subject", render: (row) => row.subject || "-" },
      { key: "service", label: "Service", render: (row) => row.services?.name || "-" },
      { key: "customer", label: "Customer", render: (row) => row.profiles?.full_name || "-" },
      { key: "provider", label: "Provider", render: (row) => row.providers?.business_name || "-" },
      {
        key: "status",
        label: "Status",
        render: (row) => <Badge variant={row.status === "resolved" ? "success" : "warning"}>{row.status}</Badge>,
      },
      { key: "comment", label: "Comment", render: (row) => row.comment || "-" },
      { key: "created_at", label: "Created", render: (row) => formatDate(row.created_at) },
    ],
  },
  settings: {
    title: "Admin Settings",
    subtitle: "Permissions, platform policies, and notification controls.",
    action: "Save",
    staticRows: [
      { name: "Admin access", status: "Enabled", updatedBy: "System", updatedOn: new Date().toISOString() },
      {
        name: "Provider approval workflow",
        status: "Enabled",
        updatedBy: "System",
        updatedOn: new Date().toISOString(),
      },
    ],
    columns: [
      { key: "name", label: "Setting" },
      { key: "status", label: "Status", render: (row) => <Badge variant="success">{row.status}</Badge> },
      { key: "updatedBy", label: "Updated By" },
      { key: "updatedOn", label: "Updated On", render: (row) => formatDate(row.updatedOn) },
    ],
  },
};

export function AdminSectionPage({ sectionOverride }) {
  const params = useParams();
  const section = sectionOverride || params.section;
  const config = sectionConfig[section];
  const dispatch = useDispatch();
  const sectionState = useSelector(selectAdminSection(section));
  const { rows, status, error } = sectionState;

  useEffect(() => {
    if (config && !config.staticRows && status === "idle") {
      dispatch(fetchAdminSection(section));
    }
  }, [config, dispatch, section, status]);

  const visibleRows = useMemo(() => {
    const sourceRows = config?.staticRows || rows;
    return config?.filterRows ? config.filterRows(sourceRows) : sourceRows;
  }, [config, rows]);

  if (!config) return <Navigate to="/sevalink-admin" replace />;

  return (
    <motion.div className="space-y-4" {...fade}>
      <SectionHeader title={config.title} subtitle={config.subtitle} action={<Button>{config.action}</Button>} />
      <Card className="grid gap-3 md:grid-cols-4">
        <Input className="md:col-span-2" placeholder={`Search ${config.title}`} />
        <Select placeholder="Filter" options={[{ label: "All", value: "all" }]} />
        <Button variant="outline">Apply</Button>
      </Card>
      {status === "loading" && !config.staticRows ? (
        <LoadingGrid count={3} />
      ) : status === "failed" ? (
        <ErrorState description={error} onRetry={() => dispatch(fetchAdminSection(section))} />
      ) : visibleRows.length ? (
        <DataTable
          columns={[
            ...config.columns,
            {
              key: "action",
              label: "Action",
              render: () => (
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              ),
            },
          ]}
          rows={visibleRows}
        />
      ) : (
        <EmptyState title={`No ${config.title.toLowerCase()} found`} />
      )}
    </motion.div>
  );
}

// ── Admin Notifications ────────────────────────────────────────

export function AdminNotificationsPage() {
  const { data, isLoading, refetch } = useAdminPendingItemsQuery();
  const navigate = useNavigate();
  const [actionId, setActionId] = useState(null);

  const pendingProviders = data?.pendingProviders || [];
  const pendingServiceRequests = data?.pendingServiceRequests || [];
  const totalCount = pendingProviders.length + pendingServiceRequests.length;

  async function handleProviderAction(row, newStatus) {
    setActionId(row.id);
    try {
      await supabase.from("profiles").update({ approval_status: newStatus }).eq("id", row.id);
      if (row.provider_record_id) {
        const providerStatus = newStatus === "approved" ? "approved" : "rejected";
        await supabase
          .from("providers")
          .update({ verified: newStatus === "approved", status: providerStatus })
          .eq("id", row.provider_record_id);
      }
      refetch();
    } catch (e) {
      console.error("Approval failed:", e);
    } finally {
      setActionId(null);
    }
  }

  async function handleServiceRequestAction(req, action) {
    setActionId(req.id);
    try {
      if (action === "approve") {
        await supabase.from("services").insert({
          name: req.service_name || req.name,
          description: req.description || "",
          category_id: req.category_id || null,
        });
      }
      await supabase
        .from("service_requests")
        .update({ status: action === "approve" ? "approved" : "denied" })
        .eq("id", req.id);
      refetch();
    } catch (e) {
      console.error("Service request action failed:", e);
    } finally {
      setActionId(null);
    }
  }

  return (
    <motion.div className="space-y-6" {...fade}>
      <SectionHeader
        title="Notifications"
        subtitle="Pending provider registrations and service requests that need your attention."
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <LoadingGrid count={4} />
      ) : totalCount === 0 ? (
        <EmptyState
          title="All caught up!"
          description="No pending provider registrations or service requests right now."
        />
      ) : (
        <div className="space-y-6">
          {/* Pending Provider Registrations */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">
                Pending Provider Registrations
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {pendingProviders.length}
                </span>
              </h2>
            </div>
            {pendingProviders.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted-foreground">No pending registrations.</Card>
            ) : (
              <div className="space-y-3">
                {pendingProviders.map((provider) => (
                  <Card key={provider.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{provider.full_name || "Unknown Provider"}</p>
                        <p className="text-sm text-muted-foreground">{provider.phone || "No phone"}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> Registered {formatDate(provider.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate("/sevalink-admin/providers")}>
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        disabled={actionId === provider.id}
                        onClick={() => handleProviderAction(provider, "approved")}>
                        {actionId === provider.id ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionId === provider.id}
                        onClick={() => handleProviderAction(provider, "denied")}>
                        {actionId === provider.id ? "…" : "Deny"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pending Service Requests */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold">
                Pending Service Requests
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {pendingServiceRequests.length}
                </span>
              </h2>
            </div>
            {pendingServiceRequests.length === 0 ? (
              <Card className="py-6 text-center text-sm text-muted-foreground">No pending service requests.</Card>
            ) : (
              <div className="space-y-3">
                {pendingServiceRequests.map((req) => (
                  <Card key={req.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <Wrench className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{req.service_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Requested by {req.providers?.business_name || "a provider"}
                          {req.categories?.name && (
                            <> &nbsp;·&nbsp; <span className="text-primary">{req.categories.name}</span></>
                          )}
                        </p>
                        {req.description && (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{req.description}</p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {formatDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={actionId === req.id}
                        onClick={() => handleServiceRequestAction(req, "approve")}>
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        {actionId === req.id ? "…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={actionId === req.id}
                        onClick={() => handleServiceRequestAction(req, "deny")}>
                        <X className="mr-1 h-3.5 w-3.5" />
                        {actionId === req.id ? "…" : "Deny"}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
