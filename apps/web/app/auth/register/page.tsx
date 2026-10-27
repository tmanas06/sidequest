'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const db = createClient()
    const { error: signUpError } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const db = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const next = params?.get('redirect') || '/schedule'
      const { error: oauthError } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      })
      if (oauthError) throw oauthError
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Google')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.2)' }}
          >
            <span className="text-3xl">✓</span>
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Check your email
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm" style={{ color: 'var(--color-brand-light)' }}>
            Back to events →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div
            className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6c8df8 0%, #a78bfa 100%)' }}
          >
            <Zap size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Join SideQuest
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Free forever — plan your Web3 week
          </p>
        </div>

        {/* Google 1-Click Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 bg-white text-black hover:bg-slate-100 transition-all shadow-md active:scale-[0.99] mb-4 cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center mb-5">
          <div className="flex-1 border-t border-white/10" />
          <span className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>
              Display name
            </label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }} />
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-9 pr-4 h-11 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(13,17,23,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>
              Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full pl-9 pr-4 h-11 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(13,17,23,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}>
              Password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min 8 characters"
                className="w-full pl-9 pr-10 h-11 rounded-xl text-sm outline-none"
                style={{
                  background: 'rgba(13,17,23,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #6c8df8, #a78bfa)', color: 'white' }}
          >
            {loading ? 'Creating account…' : 'Create free account'}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--color-brand-light)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
