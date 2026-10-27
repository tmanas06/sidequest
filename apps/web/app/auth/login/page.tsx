'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) setError(decodeURIComponent(err))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const db = createClient()
    const { error: signInError } = await db.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const next = params?.get('redirect') || '/schedule'
      router.push(next)
      router.refresh()
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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center bg-[#191D24] border border-[#292E36] text-[#C6F36B]">
            <Zap size={20} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F0]">
            Welcome back
          </h1>
          <p className="text-xs text-[#9298A3] mt-1">
            Sign in to manage your schedule and friends
          </p>
        </div>

        {/* Google 1-Click Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full h-10 rounded-lg font-medium text-xs flex items-center justify-center gap-2.5 bg-[#F5F5F0] text-[#0B0D10] hover:bg-white transition-colors shadow-sm mb-4 cursor-pointer"
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

        <div className="relative flex items-center justify-center mb-4">
          <div className="flex-1 border-t border-[#292E36]" />
          <span className="px-2.5 text-[10px] font-mono text-[#9298A3] uppercase tracking-wider">
            or with email
          </span>
          <div className="flex-1 border-t border-[#292E36]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label htmlFor="email" className="block text-[11px] font-mono uppercase tracking-wider text-[#9298A3] mb-1">
              Email
            </label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9298A3]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full pl-9 pr-3 h-10 rounded-lg text-xs bg-[#14171C] border border-[#292E36] text-[#F5F5F0] placeholder-[#9298A3]/50 focus:outline-none focus:border-[#C6F36B]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-[11px] font-mono uppercase tracking-wider text-[#9298A3]">
                Password
              </label>
              <Link href="/auth/reset-password" className="text-xs text-[#9298A3] hover:text-[#F5F5F0]">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9298A3]" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-9 pr-9 h-10 rounded-lg text-xs bg-[#14171C] border border-[#292E36] text-[#F5F5F0] placeholder-[#9298A3]/50 focus:outline-none focus:border-[#C6F36B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9298A3] hover:text-[#F5F5F0]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/25">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs mt-6 text-[#9298A3]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-[#C6F36B] hover:underline font-medium">
            Join free
          </Link>
        </p>
      </div>
    </div>
  )
}
