/**
 * Checkout / Header — two-tone title + the 1-2-3 step indicator.
 * Owner Figma redesign, node 3790:4382 (checkout redesign 3790:4379). Style v3: step
 * chips are BORDERLESS white pills lifted by a drop shadow — never a stroke. Active
 * step: gradient-FILL circle + ink text; inactive: grey circle + muted text.
 * v3 RESPONSIVE (Figma 3977-251): pe mobil titlu 28/34, subtitlu 13/19 #4d5b6a și
 * stepper pe UN rând — cercuri 28 (size-7), text 11, chip alb FĂRĂ bordură (fără stroke
 * pe mobil), pașii inactivi #4d5b6a pe #f0f2f4, separatoare „—" 11 #cccccc.
 * Bilingual site (RO under /ro): all copy comes from the `checkout` dictionary section.
 */

import { getDictionary } from '@/lib/i18n/dictionaries'
import type { Locale } from '@/lib/i18n/config'

export default function CheckoutHeader({
  locale,
  currentStep = 1,
}: {
  locale: Locale
  currentStep?: 1 | 2 | 3
}) {
  const t = getDictionary(locale).checkout
  const steps = [t.stepDetails, t.stepPayment, t.stepConfirmation] as const

  return (
    <header className="flex flex-col items-center gap-3 px-4 pt-12 lg:gap-5 lg:pt-[100px]">
      <h1 className="max-w-[348px] text-center text-[28px] font-semibold leading-[34px] tracking-[-1px] text-ink lg:max-w-none lg:text-[clamp(34px,6vw,54px)] lg:leading-normal lg:tracking-[-1.5px]">
        {t.headerTitle}{' '}
        <span className="text-gradient-brand tracking-[-1.2px] lg:tracking-[-2.16px]">
          {t.headerTitleAccent}
        </span>
      </h1>
      <p className="max-w-[350px] text-center text-[13px] leading-[19px] text-grey-600 lg:max-w-none lg:text-[16px] lg:leading-normal">
        {t.headerSubtitle}
      </p>

      <ol className="flex items-center gap-1.5 pt-2 lg:gap-3">
        {steps.map((label, i) => {
          const num = i + 1
          const active = num === currentStep
          return (
            <li key={label} className="flex items-center gap-1.5 lg:gap-3">
              <span className="flex items-center gap-1.5 rounded-full bg-white py-1.5 pl-1.5 pr-2 lg:gap-2 lg:pr-3.5 lg:shadow-[0_2px_10px_rgba(77,77,77,0.06)]">
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-[11px] font-semibold lg:text-[13px] ${
                    active
                      ? 'bg-gradient-to-b from-steel to-blue to-[80%] text-white'
                      : 'bg-[#f0f2f4] text-grey-600'
                  }`}
                >
                  {num}
                </span>
                <span
                  className={`text-[11px] font-medium lg:text-[14px] ${active ? 'text-ink' : 'text-grey-600'}`}
                >
                  {label}
                </span>
              </span>
              {num < 3 && (
                <span aria-hidden className="text-[11px] text-[#cccccc] lg:text-[14px]">
                  —
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </header>
  )
}
