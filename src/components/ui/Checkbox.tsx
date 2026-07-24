'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'

import { cn } from './cn'

export type CheckboxProps = {
  label: ReactNode
  error?: string
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'>

export function Checkbox({ label, error, className, id: idProp, ...rest }: CheckboxProps) {
  const autoId = useId()
  const id = idProp ?? autoId
  const errorId = `${id}-error`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-1 size-4 shrink-0 rounded border-ice accent-blue"
          {...rest}
        />
        <label htmlFor={id} className="text-sm text-ink">
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
