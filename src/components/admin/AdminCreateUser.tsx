/**
 * AdminCreateUser — the create-admin-user screen.
 * 1:1 from Figma (node 3770:18): 480px card, "Create a new user." title,
 * Admin/Editor role toggle (gradient FILL on the active pill, no stroke),
 * name/email/password/confirm (gray strokes, gray placeholders), password hint,
 * gradient CTA. Blue appears ONLY on titles, links and gradient fills.
 *
 * Payload `users` collection is admin-only — never clients (CLAUDE.md §3.1).
 * Mounted as the custom `createFirstUser` view: in that state nobody is logged
 * in, so submits go to Payload's dedicated `/api/users/first-register` (which
 * also signs the new user in). With `firstUser={false}` (an authenticated admin
 * adding a teammate) it posts a plain create to `/api/users`.
 */

'use client'

import { useState } from 'react'

import AdminAuthShell, { AdminBrand, adminInputCls } from './AdminAuthShell'

const ROLES = ['Admin', 'Editor'] as const
type Role = (typeof ROLES)[number]

export default function AdminCreateUser({ firstUser = false }: { firstUser?: boolean }) {
  const [role, setRole] = useState<Role>('Admin')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    setError(null)

    const data = Object.fromEntries(new FormData(e.currentTarget).entries())
    const password = String(data.password ?? '')

    if (password.length < 8 || !/\d/.test(password)) {
      setError('Password must be at least 8 characters and include a number.')
      return
    }
    if (password !== data.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(firstUser ? '/api/users/first-register' : '/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password,
          role: role.toLowerCase(),
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          errors?: { message?: string }[]
        } | null
        setError(body?.errors?.[0]?.message ?? 'Could not create the user. Please try again.')
        return
      }

      // first-register signs the new user in; otherwise land on the users list.
      window.location.assign(firstUser ? '/admin' : '/admin/collections/users')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminAuthShell>
      <form
        onSubmit={onSubmit}
        className="flex w-[480px] max-w-full flex-col items-center gap-3.5 rounded-[24px] border-[6px] border-line-soft bg-white px-10 pb-9 pt-10 shadow-[3px_12px_32px_rgba(77,77,77,0.06)]"
      >
        <AdminBrand />

        <h1 className="text-[32px] font-semibold tracking-[-1px] text-ink">
          Create a <span className="text-gradient-brand tracking-[-1.3px]">new user.</span>
        </h1>
        {/* Figma lets this line run slightly wider than the inputs — keep it on one
            line on desktop (it re-wraps, centered, on narrow viewports). */}
        <p className="text-center text-[14px] text-grey-600 sm:whitespace-nowrap">
          Admin accounts can manage courses, orders and content.
        </p>

        {/* Role — segmented toggle, active pill gets the gradient fill */}
        {/* Figma 3770:18: ~24px extra air between the intro copy and the form */}
        <div className="mt-6 flex w-full flex-col gap-2">
          <span className="text-[13px] font-medium tracking-[-0.3px] text-ink">Role</span>
          <div className="flex w-fit rounded-full bg-line-soft p-1.5">
            {ROLES.map((r) => {
              const active = r === role
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-full px-[18px] py-[7px] text-[14px] font-medium ${
                    active
                      ? 'bg-gradient-to-b from-steel to-blue to-[80%] text-white'
                      : 'text-grey-600'
                  }`}
                >
                  {r}
                </button>
              )
            })}
          </div>
        </div>

        <input name="name" required placeholder="Full name" className={adminInputCls} />
        <input
          name="email"
          type="email"
          required
          placeholder="Email address"
          className={adminInputCls}
        />

        <div className="relative w-full">
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="Password"
            className={`${adminInputCls} pr-16`}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-[18px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-grey-600 hover:text-ink"
          >
            {showPass ? 'Hide' : 'Show'}
          </button>
        </div>
        <input
          name="confirmPassword"
          type={showPass ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder="Confirm password"
          className={adminInputCls}
        />

        <div className="flex w-full items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-steel" />
          <span className="text-[12px] text-grey-600">Minimum 8 characters, at least one number.</span>
        </div>

        {error && (
          <p role="alert" className="w-full text-center text-[13px] text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 w-full rounded-full bg-gradient-to-b from-steel to-blue to-[80%] pb-3.5 pt-[13px] text-[16px] font-medium text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {submitting ? 'Creating…' : 'Create user'}
        </button>

        {/* FĂRĂ link „Back to sign in": vederea asta e create-FIRST-user — Payload
            redirecționează /admin/login înapoi aici cât timp nu există niciun admin,
            deci linkul ar fi mereu un no-op derutant. */}
      </form>
    </AdminAuthShell>
  )
}
