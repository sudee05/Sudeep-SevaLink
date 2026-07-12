import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { providerRegistrationSteps } from '@/data/mockData'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

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

function LoginForm({ portalLabel = 'customer' }) {
  const toast = useToast()
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(() => {
        toast.success(`Mock login successful for ${portalLabel}`)
      })}
    >
      <Input placeholder="Email" {...form.register('email')} />
      {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
      <Input type="password" placeholder="Password" {...form.register('password')} />
      {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
      <Button className="w-full" type="submit">Continue</Button>
    </form>
  )
}

function RegisterForm({ portal = 'customer' }) {
  const toast = useToast()
  const schema = useMemo(() => z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(6),
  }), [])
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', password: '' } })

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(() => toast.success(`Mock ${portal} registration submitted`))}>
      <Input placeholder="Full Name" {...form.register('name')} />
      <Input placeholder="Email" {...form.register('email')} />
      <Input placeholder="Phone" {...form.register('phone')} />
      <Input type="password" placeholder="Password" {...form.register('password')} />
      <Button className="w-full" type="submit">Create account</Button>
    </form>
  )
}

export function CustomerLoginPage() {
  return (
    <AuthShell
      title="Customer Login"
      subtitle="Welcome back to SevaLink"
      footer={<>New here? <Link to="/register" className="font-semibold text-primary">Create account</Link></>}
    >
      <LoginForm />
      <Link to="/forgot-password" className="text-sm font-medium text-primary">Forgot password?</Link>
      <div className="rounded-xl border border-border bg-muted/40 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Other portals</p>
        <div className="grid gap-2 text-sm">
          <Link to="/provider/register" className="font-medium text-primary hover:underline">
            Service Provider? Sign up here
          </Link>
          <Link to="/provider/login" className="font-medium text-primary hover:underline">
            Service Provider Login
          </Link>
          <Link to="/admin/login" className="font-medium text-primary hover:underline">
            Admin Login
          </Link>
        </div>
      </div>
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
  return (
    <AuthShell title="Forgot Password" subtitle="We will send reset instructions to your email.">
      <Input placeholder="Email address" />
      <Button className="w-full">Send Reset Link</Button>
      <Link to="/reset-password" className="text-sm font-medium text-primary">Already have a code? Reset now</Link>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  return (
    <AuthShell title="Reset Password" subtitle="Set a secure new password.">
      <Input type="password" placeholder="New password" />
      <Input type="password" placeholder="Confirm password" />
      <Button className="w-full">Update Password</Button>
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
      title="Provider Login"
      subtitle="Access your bookings, earnings, and profile"
      footer={<>Need provider account? <Link to="/provider/register" className="font-semibold text-primary">Apply now</Link></>}
    >
      <LoginForm portalLabel="provider" />
      <Link to="/provider/forgot-password" className="text-sm font-medium text-primary">Forgot password?</Link>
    </AuthShell>
  )
}

export function ProviderRegisterPage() {
  const [step, setStep] = useState(0)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Provider Registration Wizard</h1>
        <p className="text-sm text-muted-foreground">Complete onboarding to get verified and start receiving bookings.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        {providerRegistrationSteps.map((item, idx) => (
          <div key={item} className={`rounded-lg border px-2 py-1 ${idx <= step ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}>
            {item}
          </div>
        ))}
      </div>
      <Card className="space-y-3">
        <Input placeholder="Business Name" />
        <Input placeholder="Owner Name" />
        <Input placeholder="Contact Number" />
        <Select placeholder="Primary Category" options={[{ label: 'Cleaning', value: 'cleaning' }, { label: 'Salon', value: 'salon' }]} />
        <Textarea placeholder="Business Address" />
        <Input placeholder="Bank Account Number" />
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => setStep((value) => Math.max(0, value - 1))}>Previous</Button>
        <Button className="flex-1" onClick={() => setStep((value) => Math.min(providerRegistrationSteps.length - 1, value + 1))}>Next</Button>
      </div>
      <Button className="w-full">Submit Application</Button>
    </motion.div>
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
  return (
    <AuthShell title="Provider Forgot Password" subtitle="Receive password reset instructions via email.">
      <Input placeholder="Business email" />
      <Button className="w-full">Send Reset Link</Button>
    </AuthShell>
  )
}

export function AdminLoginPage() {
  return (
    <AuthShell title="Admin Login" subtitle="Secure access to SevaLink command center.">
      <LoginForm portalLabel="admin" />
      <Link to="/admin/forgot-password" className="text-sm font-medium text-primary">Forgot password?</Link>
    </AuthShell>
  )
}

export function AdminForgotPasswordPage() {
  return (
    <AuthShell title="Admin Password Recovery" subtitle="Request reset token via verified email.">
      <Input placeholder="Admin email" />
      <Button className="w-full">Send Recovery Link</Button>
    </AuthShell>
  )
}
