import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  resetPassword,
  updatePassword,
  selectAuthLoading,
  selectIsAuthenticated,
  selectUserRole,
  clearError,
} from '@/store/authSlice'
import { useSearchParams } from "react-router-dom";

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

/** Password input with show/hide eye toggle */
function PasswordInput({ placeholder = 'Password', ...props }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          /* Eye-off icon */
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          /* Eye icon */
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}

/** Google SVG icon */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

/** OR separator line */
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

/** Google Sign-In Button */
function GoogleSignInButton({ label = 'Continue with Google' }) {
  const dispatch = useDispatch()
  const loading = useSelector(selectAuthLoading)

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2"
      disabled={loading}
      onClick={() => dispatch(signInWithGoogle())}
    >
      <GoogleIcon />
      {label}
    </Button>
  )
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 chars'),
})

function getRedirectPath(role) {
  switch (role) {
    case 'provider': return '/provider'
    case 'admin': return '/sevalink-admin'
    default: return '/customer'
  }
}

function LoginForm() {
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
      <PasswordInput placeholder="Password" {...form.register('password')} />
      {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Continue'}
      </Button>
      <OrDivider />
      <GoogleSignInButton label="Sign in with Google" />
    </form>
  )
}

function RegisterForm() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type") || "customer";
  const toast = useToast()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const loading = useSelector(selectAuthLoading)
  const [accountType, setAccountType] = useState(type)
  const schema = useMemo(() => z.object({
    name: z.string().min(2, 'Full name is required'),
    email: z.string().email('Enter a valid email'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
    address: z.string().min(3, 'Address is required'),
    password: z.string().min(6, 'Password must be at least 6 chars'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }), [])
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', phone: '', address: '', password: '', confirmPassword: '' } })

  async function onSubmit(values) {
    dispatch(clearError())
    const result = await dispatch(signUpWithEmail({
      email: values.email,
      password: values.password,
      fullName: values.name,
      phone: values.phone,
      address: values.address,
      role: accountType,
    }))
    if (signUpWithEmail.fulfilled.match(result)) {
      toast.success(accountType === 'provider' ? 'Provider account created! Please check your email.' : 'Account created! Please check your email.')
      navigate('/verify-email')
    } else {
      toast.error(result.payload || 'Registration failed')
    }
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/30 p-1">
        {[
          { label: 'Customer', value: 'customer' },
          { label: 'Service Provider', value: 'provider' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setAccountType(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${accountType === option.value
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Input placeholder="Full Name" {...form.register('name')} />
      {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
      <Input placeholder="Email" {...form.register('email')} />
      {form.formState.errors.email && <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>}
      <Input
        placeholder="Phone (10-digit mobile)"
        type="tel"
        maxLength={10}
        {...form.register('phone')}
      />
      {form.formState.errors.phone && <p className="text-xs text-red-500">{form.formState.errors.phone.message}</p>}
      <textarea
        placeholder="Address"
        rows={2}
        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        {...form.register('address')}
      />
      {form.formState.errors.address && <p className="text-xs text-red-500">{form.formState.errors.address.message}</p>}
      <PasswordInput placeholder="Password" {...form.register('password')} />
      {form.formState.errors.password && <p className="text-xs text-red-500">{form.formState.errors.password.message}</p>}
      <PasswordInput placeholder="Re-enter Password" {...form.register('confirmPassword')} />
      {form.formState.errors.confirmPassword && <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : accountType === 'provider' ? 'Create provider account' : 'Create customer account'}
      </Button>
    </form>
  )
}

export function CustomerLoginPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  if (isAuthenticated) return <Navigate to={getRedirectPath(role)} replace />

  return (
    <AuthShell
      title="Sign In"
      subtitle="One login experience for customer, provider, and admin"
      footer={<>New here? <Link to="/register" className="font-semibold text-primary">Create account</Link></>}
    >
      <LoginForm />
      <Link to="/forgot-password" className="text-sm font-medium text-primary">Forgot password?</Link>
    </AuthShell>
  )
}

export function CustomerRegisterPage() {
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const role = useSelector(selectUserRole)

  if (isAuthenticated) return <Navigate to={getRedirectPath(role)} replace />

  return (
    <AuthShell
      title="Create Account"
      subtitle="Choose whether you are booking services or offering them"
      footer={<>Already have an account? <Link to="/login" className="font-semibold text-primary">Login</Link></>}
    >
      <RegisterForm />
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const toast = useToast()
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [sent, setSent] = useState(false)

  function validateEmail(val) {
    if (!val.trim()) return 'Email is required'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val.trim())) return 'Enter a valid email address'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validateEmail(email)
    if (err) { setEmailError(err); return }
    setEmailError('')
    const result = await dispatch(resetPassword({ email: email.trim() }))
    if (resetPassword.fulfilled.match(result)) {
      toast.success('Reset link sent! Check your email.')
      setSent(true)
    } else {
      toast.error(result.payload || 'Failed to send reset link')
    }
  }

  if (sent) {
    return (
      <AuthShell title="Check Your Email" subtitle={`We've sent a reset link to ${email.trim()}`}>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="rounded-full bg-green-100 p-5">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              <path d="m16 19 2 2 4-4" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground text-center">Check your spam folder if you don't see it.</p>
        </div>
        <Link to="/login">
          <Button className="w-full">Back to Login</Button>
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot Password" subtitle="We will send reset instructions to your email.">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Input
            placeholder="Email address"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError('') }}
          />
          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
        </div>
        <Button className="w-full" type="submit">
          {sent ? 'Link Sent' : 'Send Reset Link'}
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
        <PasswordInput placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordInput placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
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
  const toast = useToast()
  const navigate = useNavigate()
  const [secondsLeft, setSecondsLeft] = useState(180)

  useEffect(() => {
    if (secondsLeft <= 0) return

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [secondsLeft])

  function formatCountdown(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  function handleResend() {
    toast.success('Verification email sent again.')
    setSecondsLeft(180)
  }

  return (
    <AuthShell title="Verify Email" subtitle="Please check your inbox and click verification link.">
      <Card className="text-sm text-muted-foreground">Verification email sent to your registered email address.</Card>
      <Button className="w-full" onClick={handleResend} disabled={secondsLeft > 0}>
        {secondsLeft > 0 ? `Resend Email in ${formatCountdown(secondsLeft)}` : 'Resend Email'}
      </Button>
      <Button className="w-full" onClick={() => navigate('/login')}>Go to Login</Button>
    </AuthShell>
  )
}
