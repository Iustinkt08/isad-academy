'use client'

import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'

import { cn } from './cn'

export type SelectProps = {
  label: string
  error?: string
  hint?: string
  className?: string
  children: ReactNode
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>

export function Select({
  label,
  error,
  hint,
  className,
  children,
  id: idProp,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-grey-500">
          {hint}
        </p>
      )}
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full appearance-none rounded-xl border bg-paper px-4 py-2.5 text-base text-ink transition-colors',
          error ? 'border-red-600' : 'border-ice hover:border-aqua focus:border-blue',
        )}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
