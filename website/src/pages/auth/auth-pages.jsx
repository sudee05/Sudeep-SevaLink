import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  signInWithEmail,
  signUpWithEmail,
  resetPassword,
  updatePassword,
  selectAuthLoading,
  selectAuthError,
  selectUserRole,
  clearError,
} from '@/store/authSlice'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
      {footer && <p className="text-center text-sm text-muted-foreground">{footer}</p>}
    </motion.div>
  )
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 chars'),
})

function getRedirectPath(role) {
  switch (role) {
    case 'provider': return '/provider'
    case 'admin': return '/admin'
    default: return '/customer'
  }
}

function LoginForm({ portalLabel = 'customer' }) {
  const toast = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectAuthLoading)
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  async function onSubmit(values) {
    dispatch(clearError())
    const result = await dispatch(signInWithEmail(values))
    if (signInWithEmail.fulfilled.match(result)) {
      const role = result.payload.profile?.role
      toast.success('Signed in successfully!')
      navigate(getRedirectPath(role))
    } else {
      toast.error(result.payload || 'Sign in failed')
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input placeholder="Email" {...form.register('email')} />
      {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
      <Input type="password" placeholder="Password" {...form.register('password')} />
      {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Continue'}
      </Button>
    </form>
  )
}

function SharedLoginContent() {
  return (
    <>
      <LoginForm portalLabel="all roles" />
      <Link to="/forgot-password" className="text-sm font-medium text-primary">Forgot password?</Link>
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New users</p>
        <div className="grid gap-2 text-sm">
          <Link to="/register" className="font-medium text-primary hover:underline">
            Customer Sign Up
          </Link>
          <Link to="/provider/register" className="font-medium text-primary hover:underline">
            Service Provider Sign Up
          </Link>
        </div>
      </div>
    </>
  )
}

function RegisterForm({ portal = 'customer' }) {
  const toast = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectAuthLoading)
  const schema = useMemo(() => z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(6),
  }), [])
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', password: '' } })

  async function onSubmit(values) {
    dispatch(clearError())
    const result = await dispatch(signUpWithEmail({
      email: values.email,
      password: values.password,
      fullName: values.name,
      phone: values.phone,
      role: portal,
    }))
    if (signUpWithEmail.fulfilled.match(result)) {
      toast.success('Account created! Please check your email for verification.')
      navigate('/verify-email')
    } else {
      toast.error(result.payload || 'Registration failed')
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <Input placeholder="Full Name" {...form.register('name')} />
      <Input placeholder="Email" {...form.register('email')} />
      <Input placeholder="Phone" {...form.register('phone')} />
      <Input type="password" placeholder="Password" {...form.register('password')} />
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  )
}

export function CustomerLoginPage() {
  return (
    <AuthShell
      title="Sign In"
      subtitle="One login experience for customer, provider, and admin"
      footer={<>New here? <Link to="/register" className="font-semibold text-primary">Create account</Link></>}
    >
      <SharedLoginContent />
    </AuthShell>
  )
}

export function CustomerRegisterPage() {
  return (
    <AuthShell
      title="Create Customer Account"
      subtitle="Book premium services in minutes"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Login</Link></>}
    >
      <RegisterForm portal="customer" />
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    const result = await dispatch(resetPassword({ email }))
    if (resetPassword.fulfilled.match(result)) {
      toast.success('Reset link sent! Check your email.')
      setSent(true)
    } else {
      toast.error(result.payload || 'Failed to send reset link')
    }
  }

  return (
    <AuthShell title="Forgot Password" subtitle="We will send reset instructions to your email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          placeholder="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button className="w-full" type="submit" disabled={sent}>
          {sent ? 'Link Sent ✓' : 'Send Reset Link'}
        </Button>
      </form>
      <Link to="/reset-password" className="text-sm font-medium text-primary">Already have a code? Reset now</Link>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    const result = await dispatch(updatePassword({ password }))
    if (updatePassword.fulfilled.match(result)) {
      toast.success('Password updated successfully!')
      navigate('/login')
    } else {
      toast.error(result.payload || 'Failed to update password')
    }
  }

  return (
    <AuthShell title="Reset Password" subtitle="Set a secure new password.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button className="w-full" type="submit">Update Password</Button>
      </form>
    </AuthShell>
  )
}

export function OtpPage() {
  return (
    <AuthShell title="OTP Verification" subtitle="Enter the 6-digit code sent to your phone.">
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 6 }).map((_, idx) => <Input key={idx} maxLength={1} className="text-center" />)}
      </div>
      <Button className="w-full">Verify OTP</Button>
    </AuthShell>
  )
}

export function EmailVerificationPage() {
  return (
    <AuthShell title="Verify Email" subtitle="Please check your inbox and click verification link.">
      <Card className="text-sm text-muted-foreground">Verification email sent to your registered email address.</Card>
      <Button className="w-full">Resend Email</Button>
    </AuthShell>
  )
}

export function ProviderLoginPage() {
  return (
    <AuthShell
      title="Sign In"
      subtitle="One login experience for customer, provider, and admin"
      footer={<>Need provider account? <Link to="/provider/register" className="font-semibold text-primary">Apply now</Link></>}
    >
      <SharedLoginContent />
    </AuthShell>
  )
}

export function ProviderRegisterPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectAuthLoading)
  const schema = useMemo(() => z.object({
    fullName: z.string().min(2, 'Full name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().min(10, 'Valid phone is required'),
    serviceType: z.string().min(1, 'Please select a service type'),
    password: z.string().min(6, 'Password must be at least 6 chars'),
  }), [])
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      serviceType: '',
      password: '',
    },
  })

  async function onSubmit(values) {
    dispatch(clearError())
    const result = await dispatch(signUpWithEmail({
      email: values.email,
      password: values.password,
      fullName: values.fullName,
      phone: values.phone,
      role: 'provider',
    }))
    if (signUpWithEmail.fulfilled.match(result)) {
      toast.success('Provider application submitted!')
      navigate('/provider/application-submitted')
    } else {
      toast.error(result.payload || 'Registration failed')
    }
  }

  return (
    <AuthShell
      title="Service Provider Sign Up"
      subtitle="Add basic details and choose your service type"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Sign in</Link></>}
    >
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Input placeholder="Full Name" {...form.register('fullName')} />
        {form.formState.errors.fullName && <p className="text-xs text-red-500">{form.formState.errors.fullName.message}</p>}
        <Input placeholder="Email" {...form.register('email')} />
        {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
        <Input placeholder="Phone Number" {...form.register('phone')} />
        {form.formState.errors.phone && <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>}
        <Select
          options={[
            { label: 'Home Cleaning', value: 'home_cleaning' },
            { label: 'Salon & Beauty', value: 'salon_beauty' },
            { label: 'Repair & Maintenance', value: 'repair_maintenance' },
            { label: 'Driver Services', value: 'driver_services' },
          ]}
          placeholder="Type of Service"
          {...form.register('serviceType')}
        />
        {form.formState.errors.serviceType && <p className="text-xs text-red-500">{form.formState.errors.serviceType.message}</p>}
        <Input type="password" placeholder="Password" {...form.register('password')} />
        {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? 'Submitting…' : 'Create Provider Account'}
        </Button>
      </motion.form>
    </AuthShell>
  )
}

function ProviderStatusTemplate({ title, message, actionText }) {
  return (
    <AuthShell title={title} subtitle={message}>
      <Card className="text-sm text-muted-foreground">Your provider application status is updated in real-time in this portal.</Card>
      <Button className="w-full">{actionText}</Button>
    </AuthShell>
  )
}

export function ProviderApplicationSubmittedPage() {
  return <ProviderStatusTemplate title="Application Submitted" message="Thanks for applying. We have received your details." actionText="Go to Login" />
}

export function ProviderPendingApprovalPage() {
  return <ProviderStatusTemplate title="Pending Approval" message="Verification team is reviewing your documents." actionText="Refresh Status" />
}

export function ProviderRejectedPage() {
  return <ProviderStatusTemplate title="Application Rejected" message="Some details require correction before approval." actionText="Update Application" />
}

export function ProviderApprovedPage() {
  return <ProviderStatusTemplate title="Application Approved" message="You are now live on SevaLink marketplace." actionText="Go to Provider Dashboard" />
}

export function ProviderForgotPasswordPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    const result = await dispatch(resetPassword({ email }))
    if (resetPassword.fulfilled.match(result)) {
      toast.success('Reset link sent!')
      setSent(true)
    } else {
      toast.error(result.payload || 'Failed to send reset link')
    }
  }

  return (
    <AuthShell title="Provider Forgot Password" subtitle="Receive password reset instructions via email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Business email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button className="w-full" type="submit" disabled={sent}>
          {sent ? 'Link Sent ✓' : 'Send Reset Link'}
        </Button>
      </form>
    </AuthShell>
  )
}

export function AdminLoginPage() {
  return (
    <AuthShell title="Sign In" subtitle="One login experience for customer, provider, and admin">
      <SharedLoginContent />
    </AuthShell>
  )
}

export function AdminForgotPasswordPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email) return
    const result = await dispatch(resetPassword({ email }))
    if (resetPassword.fulfilled.match(result)) {
      toast.success('Recovery link sent!')
      setSent(true)
    } else {
      toast.error(result.payload || 'Failed to send recovery link')
    }
  }

  return (
    <AuthShell title="Admin Password Recovery" subtitle="Request reset token via verified email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input placeholder="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button className="w-full" type="submit" disabled={sent}>
          {sent ? 'Link Sent ✓' : 'Send Recovery Link'}
        </Button>
      </form>
    </AuthShell>
  )
}
