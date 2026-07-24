'use client'

import { useId } from 'react'
import type { TextareaHTMLAttributes } from 'react'

import { cn } from './cn'

export type TextareaProps = {
  label: string
  error?: string
  hint?: string
  className?: string
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

export function Textarea({ label, error, hint, className, id: idProp, ...rest }: TextareaProps) {
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
      <textarea
        id={id}
        rows={rest.rows ?? 5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-xl border bg-paper px-4 py-2.5 text-base text-ink transition-colors placeholder:text-grey-500/70',
          error ? 'border-red-600' : 'border-ice hover:border-aqua focus:border-blue',
        )}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
