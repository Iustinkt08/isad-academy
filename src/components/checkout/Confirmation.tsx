/**
 * Checkout / Confirmation — pagina de după plată („Enrolment confirmed").
 * RESPONSIVE. Desktop (≥lg): 1:1 cu Figma 4031-156 (card 560, titlu 54).
 * Mobil (<lg): 1:1 cu Figma 4031-218 (card 350, titlu 28/34, stepper compact).
 *
 * ⚠️ ANIMAȚIA CERUTĂ DE OWNER: INELUL GRADIENT din jurul bifei de succes SE
 * ROTEȘTE continuu (rotație lentă, ~2.5s/tură, linear). Bifa și interiorul
 * alb rămân STATICE — se rotește doar inelul gradient din spate.
 * `prefers-reduced-motion` → inelul stă pe loc (motion-reduce:animate-none).
 *
 * Stepperul e cel din checkout, cu pașii 1–2 COMPLETAȚI (bifă gradient pe cerc
 * #F0F2F4) și pasul 3 ACTIV (cerc gradient). Componentă separată de
 * CheckoutHeader (chips cu bordură pe pașii ne-activi aici, nu cu umbră) ca să
 * nu se schimbe nimic vizual la pașii 1–2 din checkout.
 *
 * REGULI (owner): fără borduri albastre; gri #E6E6E6/#F6F6F6; albastrul doar pe
 * accente și fill-uri gradient. TOATE valorile EXPLICITE (px/hex). Copy-ul vine
 * din dicționarul `checkout` (site bilingv, RO sub /ro) — nu hardcodat aici.
 */

/** Bifă mică gradient — stroke #1C5D99→#407EA2, capete rotunde */
function GradCheck({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 12 10" fill="none" className={className}>
      <path
        d="M1.7 5.3L4.5 8.1L10.3 1.7"
        stroke="url(#cf-chk)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="cf-chk" x1="1.7" y1="1.7" x2="10.3" y2="8.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1C5D99" />
          <stop offset="1" stopColor="#407EA2" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/* ---------- Stepperul cu pașii 1–2 completați, pasul 3 activ ---------- */
export function ConfirmationStepper({ steps }: { steps: readonly [string, string, string] }) {
  return (
    <ol className="flex items-center gap-1.5 lg:gap-3">
      {steps.map((label, i) => {
        const num = i + 1
        const active = num === 3
        return (
          <li key={label} className="flex items-center gap-1.5 lg:gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-[999px] bg-white py-1.5 pl-1.5 pr-2 lg:gap-2 lg:pr-3.5 ${
                active ? '' : 'lg:border lg:border-[#e6e6e6]'
              }`}
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full ${
                  active
                    ? 'bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%]'
                    : 'bg-[#f0f2f4]'
                }`}
              >
                {active ? (
                  <span className="text-[11px] font-semibold text-white lg:text-[13px]">3</span>
                ) : (
                  <GradCheck className="h-[8px] w-[10px] lg:h-[9px] lg:w-[11px]" />
                )}
              </span>
              <span
                className={`text-[11px] font-medium lg:text-[14px] ${
                  active ? 'text-[#222222]' : 'text-[#4d5b6a] lg:text-[#959595]'
                }`}
              >
                {label}
              </span>
            </span>
            {num < 3 && <span aria-hidden className="text-[11px] text-[#cccccc] lg:text-[14px]">−</span>}
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Bifa de succes cu INELUL GRADIENT ROTITOR ---------- */
export function SuccessMark({ ariaLabel }: { ariaLabel: string }) {
  return (
    <span className="relative block size-14 lg:size-16" role="img" aria-label={ariaLabel}>
      {/* Inelul gradient — SE ROTEȘTE (doar el) */}
      <span
        aria-hidden
        className="absolute inset-0 animate-spin rounded-full bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] [animation-duration:2.5s] [animation-timing-function:linear] motion-reduce:animate-none"
      />
      {/* Interiorul alb STATIC (lasă vizibil doar inelul de 3px) */}
      <span aria-hidden className="absolute inset-[3px] rounded-full bg-white" />
      {/* Bifa STATICĂ */}
      <GradCheck
        strokeWidth={2.5}
        className="absolute left-1/2 top-1/2 h-5 w-6 -translate-x-1/2 -translate-y-1/2 lg:h-[23px] lg:w-7"
      />
    </span>
  )
}

/* ---------- Titlul + subtitlul ---------- */
export function ConfirmationHeader({
  title,
  titleAccent,
  subtitle,
}: {
  title: string
  /** Partea din titlu randată cu gradientul #407EA2→#1C5D99 (ex. „confirmed."). */
  titleAccent?: string
  subtitle: string
}) {
  return (
    <div className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col items-center gap-3 lg:max-w-[760px] lg:gap-3.5">
      <h1 className="text-center text-[min(7.18vw,28px)] font-semibold leading-[1.22] tracking-[-1px] text-[#222222] lg:text-[54px] lg:leading-[59.4px] lg:tracking-[-1.5px]">
        {title}
        {titleAccent ? (
          <>
            {' '}
            <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
              {titleAccent}
            </span>
          </>
        ) : null}
      </h1>
      <p className="text-center text-[13px] leading-[19px] text-[#4d5b6a] lg:text-[16px] lg:leading-[26px] lg:text-[#959595]">
        {subtitle}
      </p>
    </div>
  )
}

/* ---------- Cardul de recapitulare a comenzii ---------- */
export type RecapRow = { label: string; value: string }

export function OrderRecapCard({
  orderRef,
  course,
  provider,
  rows,
  totalLabel,
  total,
}: {
  orderRef: string
  course: string
  provider: string
  rows: RecapRow[]
  totalLabel: string
  total: string
}) {
  return (
    <section
      data-testid="order-recap"
      className="flex w-full max-w-[min(350px,calc(100vw_-_40px))] flex-col gap-3 rounded-[24px] bg-white p-6 shadow-[3px_9px_24px_rgba(77,77,77,0.04)] lg:max-w-[560px] lg:gap-3.5 lg:border-[6px] lg:border-[#f6f6f6] lg:px-8 lg:py-[30px] lg:shadow-[3px_9px_20px_rgba(77,77,77,0.03)]"
    >
      <p className="text-[12px] font-medium tracking-[0.2px] text-[#959595]">{orderRef}</p>

      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#f6f6f6] text-[17px] font-semibold text-[#1c5d99] lg:size-12 lg:text-[18px]">
          {course.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-medium leading-6 tracking-[-0.5px] text-[#222222] lg:text-[18px] lg:leading-[26px]">
            {course}
          </h2>
          <p className="text-[13px] leading-[19px] text-[#959595]">{provider}</p>
        </div>
      </div>

      <hr className="border-[#ececec]" />

      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-3">
          <span className="text-[13.5px] leading-5 text-[#595959] lg:text-[14px] lg:leading-[21px]">
            {r.label}
          </span>
          <span className="text-[13.5px] font-medium leading-5 text-[#222222] lg:text-[14px] lg:leading-[21px]">
            {r.value}
          </span>
        </div>
      ))}

      <hr className="border-[#ececec]" />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold tracking-[-0.3px] text-[#222222]">
          {totalLabel}
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.4px] text-[#222222] lg:text-[18px]">
          {total}
        </span>
      </div>
    </section>
  )
}
