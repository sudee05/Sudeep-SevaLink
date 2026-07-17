import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { PortalSidebar } from '@/components/common/portal-sidebar'
import { PortalTopbar } from '@/components/common/portal-topbar'
import { providerNav } from '@/routes/nav-data'
import { selectProfile, selectUser } from '@/store/authSlice'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import { ShieldCheck, Clock, XCircle, Briefcase, MapPin, FileText, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { LocationSelector } from '@/components/common/location-selector'

// ── Step indicator ────────────────────────────────────────────

function StepDot({ n, active, done }) {
  return (
    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors ${
      done ? 'bg-primary text-white' : active ? 'border-2 border-primary text-primary' : 'border-2 border-border text-muted-foreground'
    }`}>
      {done ? '✓' : n}
    </div>
  )
}

// ── Business Profile Setup Form ───────────────────────────────

function BusinessProfileSetup({ userId, profileName, profilePhone, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestName, setRequestName] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestDone, setRequestDone] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    location: '',
    about: '',
    experience: '',
  })

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    supabase
      .from('services')
      .select('id, name, description')
      .order('name')
      .then(({ data }) => setServices(data || []))
      .finally(() => setServicesLoading(false))
  }, [])

  async function handleServiceRequest(e) {
    e.preventDefault()
    if (!requestName.trim()) {
      setError('Service name is required')
      return
    }

    setRequestLoading(true)
    setError('')
    try {
      const { error: requestError } = await supabase
        .from('service_requests')
        .insert({
          user_id: userId,
          provider_id: null,
          phone: profilePhone || '',
          service_name: requestName.trim(),
          description: requestDescription.trim(),
          status: 'pending',
        })

      if (requestError) {
        setError(requestError.message)
        return
      }

      setRequestDone(true)
      setRequestName('')
      setRequestDescription('')
      setShowRequestForm(false)
    } finally {
      setRequestLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.business_name.trim()) { setError('Business name is required'); return }
    if (!form.location.trim()) { setError('Location is required'); return }

    setLoading(true)
    setError('')
    try {
      const { data: provider, error: insertError } = await supabase
        .from('providers')
        .insert({
          user_id: userId,
          business_name: form.business_name.trim(),
          location: form.location.trim(),
          about: form.about.trim(),
          experience: form.experience.trim(),
          verified: false,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertError) {
        setError(insertError.message)
      } else {
        if (provider?.id && selectedServiceId) {
          const { error: serviceError } = await supabase
            .from('provider_services')
            .insert({ provider_id: provider.id, service_id: selectedServiceId })

          if (serviceError) {
            setError(serviceError.message)
            return
          }
        }
        onComplete()
      }
    } catch (e) {
      setError(e.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
            <Briefcase className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Business Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, {profileName || 'Provider'}! Complete your profile to submit for review.
          </p>
        </div>

        {/* Steps */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <StepDot n={1} active={step === 1} done={step > 1} />
          <div className={`h-0.5 w-12 transition-colors ${step > 1 ? 'bg-primary' : 'bg-border'}`} />
          <StepDot n={2} active={step === 2} done={step > 2} />
          <div className={`h-0.5 w-12 transition-colors ${step > 2 ? 'bg-primary' : 'bg-border'}`} />
          <StepDot n={3} active={step === 3} done={false} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div>
                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1 of 3 — Basic Information</p>
                  <label className="mb-1 block text-sm font-medium">
                    <Briefcase className="mr-1.5 inline h-4 w-4 text-primary" />
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="e.g. QuickFix Home Services"
                    value={form.business_name}
                    onChange={(e) => set('business_name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <MapPin className="mr-1.5 inline h-4 w-4 text-primary" />
                    Service Area / Location <span className="text-red-500">*</span>
                  </label>
                  <LocationSelector required value={form.location} onChange={(location) => set('location', location)} />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => {
                    if (!form.business_name.trim()) { setError('Business name is required'); return }
                    if (!form.location.trim()) { setError('Location is required'); return }
                    setError('')
                    setStep(2)
                  }}
                >
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2: About */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 2 of 3 — About Your Business</p>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <Briefcase className="mr-1.5 inline h-4 w-4 text-primary" />
                    Primary Service
                  </label>
                  <Select
                    value={selectedServiceId}
                    onChange={(e) => {
                      setSelectedServiceId(e.target.value)
                      setError('')
                    }}
                    disabled={servicesLoading}
                    placeholder={servicesLoading ? 'Loading services...' : 'Select a service'}
                    options={services.map((service) => ({
                      label: service.name,
                      value: service.id,
                    }))}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowRequestForm((open) => !open)
                        setRequestDone(false)
                      }}
                    >
                      Request missing service
                    </Button>
                    {requestDone && (
                      <span className="text-xs font-medium text-green-600">Request submitted for admin review.</span>
                    )}
                  </div>
                </div>

                {showRequestForm && (
                  <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">
                      Your user ID and phone number are attached automatically.
                    </p>
                    <Input
                      placeholder="Service name"
                      value={requestName}
                      onChange={(e) => setRequestName(e.target.value)}
                    />
                    <textarea
                      className="h-20 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Short description"
                      value={requestDescription}
                      onChange={(e) => setRequestDescription(e.target.value)}
                    />
                    <Button type="button" size="sm" disabled={requestLoading || !requestName.trim()} onClick={handleServiceRequest}>
                      {requestLoading ? 'Submitting...' : 'Submit Request'}
                    </Button>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    <FileText className="mr-1.5 inline h-4 w-4 text-primary" />
                    About / Description
                  </label>
                  <textarea
                    className="h-28 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe your services, experience, and what makes you unique…"
                    value={form.about}
                    onChange={(e) => set('about', e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Years of Experience</label>
                  <Input
                    placeholder="e.g. 5 years"
                    value={form.experience}
                    onChange={(e) => set('experience', e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => {
                      if (!selectedServiceId && !requestDone) {
                        setError('Select a service or submit a request for a missing one')
                        return
                      }
                      setError('')
                      setStep(3)
                    }}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </motion.div>
            )}

            {/* Step 3: Review & Submit */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 3 of 3 — Review & Submit</p>
                <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-4 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-semibold">{form.business_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-semibold">{form.location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-semibold">{services.find((service) => service.id === selectedServiceId)?.name || (requestDone ? 'Requested new service' : '-')}</span></div>
                  {form.experience && <div className="flex justify-between"><span className="text-muted-foreground">Experience</span><span className="font-semibold">{form.experience}</span></div>}
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-xs text-primary">
                    After submitting, our team will review your profile within <strong>1–2 business days</strong>.
                  </p>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading}>Back</Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit for Review'}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ── Under Review / Denied Screen ──────────────────────────────

function VerificationScreen({ status }) {
  const isRejected = status === 'denied'

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-2xl"
      >
        {isRejected ? (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Application Denied</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Unfortunately, your provider application was not approved. Please contact support for more information or to re-apply.
            </p>
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-xs font-medium text-red-600 dark:text-red-400">
                If you believe this was in error, reach out to our admin team.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              >
                <Clock className="h-10 w-10 text-primary" />
              </motion.div>
            </div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verification In Progress
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Your account is under review</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our admin team is verifying your provider profile and documents. This usually takes <strong>1–2 business days</strong>. You'll be notified once approved.
            </p>
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-xs font-medium text-primary">
                Make sure your profile and documents are complete to speed up the process.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}

// ── ProviderLayout ────────────────────────────────────────────

export function ProviderLayout() {
  const profile = useSelector(selectProfile)
  const user = useSelector(selectUser)
  const [providerRecord, setProviderRecord] = useState(undefined) // undefined = loading
  const approvalStatus = profile?.approval_status

  // Check if this provider has completed their business profile
  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('providers')
      .select('id, status')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProviderRecord(data) // null if no record, object if exists
      })
  }, [user?.id])

  // Still loading provider record check
  if (providerRecord === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your profile…</p>
        </div>
      </div>
    )
  }

  // No business profile yet → show setup wizard
  if (!providerRecord) {
    return (
      <BusinessProfileSetup
        userId={user?.id}
        profileName={profile?.full_name}
        profilePhone={profile?.phone}
        onComplete={() => setProviderRecord({ id: 'pending', status: 'pending' })}
      />
    )
  }

  // Has business profile but not yet approved → show verification screen
  if (approvalStatus && approvalStatus !== 'approved') {
    return <VerificationScreen status={approvalStatus} />
  }

  // Fully approved → show full dashboard
  return (
    <div className="flex min-h-screen">
      <PortalSidebar title="Provider Studio" nav={providerNav} />
      <section className="flex min-h-screen flex-1 flex-col">
        <PortalTopbar title="Service Provider Dashboard" notificationPath="/provider/notifications" />
        <div className="page-enter flex-1 p-4 lg:p-6">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
