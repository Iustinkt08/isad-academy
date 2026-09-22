'use client'

import { useEffect, useRef, type ReactNode, type RefObject } from 'react'

/**
 * Pointer interaction for the CSS marquees (owner 2026-09-22).
 *
 * 1. SMOOTH HOVER PAUSE — the band must not stop dead under the pointer: it eases to a halt
 *    and eases back up when the pointer leaves. `animation-play-state` cannot be transitioned,
 *    so the keyframe animation is left untouched and its `playbackRate` is eased instead
 *    (towards 0 on enter, back to 1 on leave). Setting `playbackRate` preserves the
 *    animation's current time, so the band decelerates in place — no jump, no reset.
 *
 * 2. DRAG TO BROWSE (opt-in, testimonials) — press and drag horizontally to slide the cards
 *    by hand. The drag is mapped onto the same animation: a pixel offset becomes a shift of
 *    the animation's `currentTime` (the track travels half its width per iteration), so the
 *    marquee simply resumes from wherever the cards were left. A short inertia keeps the
 *    cards gliding after release. Works with either keyframe direction.
 *
 * Touch/pen pointers are ignored (a tap would otherwise freeze the band until the next tap
 * elsewhere; on phones the testimonials are a native snap scroller anyway). Under
 * `prefers-reduced-motion`, and below `lg` on the testimonials track (`animate-none`), there
 * is no animation to act on — everything here is a no-op.
 */

/**
 * Ramp durations (owner 2026-09-22, "și mai smooth"): a long, ease-in-out deceleration —
 * it starts gently instead of braking hardest in the first frames — and a somewhat quicker
 * but equally eased pick-up when the pointer leaves.
 */
const STOP_MS = 1400
const RESUME_MS = 900
/** easeInOutCubic — gentle at both ends of the ramp. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Inertia after a drag: velocity multiplier per 16ms frame, and the px/ms floor that ends it. */
const FRICTION = 0.92
const INERTIA_MIN = 0.02
/** Pointer moves below this distance (px) are not a drag — keeps a plain click a click. */
const DRAG_SLOP = 3

const marqueeAnimations = (el: HTMLElement): CSSAnimation[] =>
  el
    .getAnimations({ subtree: true })
    .filter((a): a is CSSAnimation => a instanceof CSSAnimation && /marquee/.test(a.animationName))

/** px → animation ms for one marquee: the keyframes cover half the track width per iteration. */
const pxToMs = (animation: CSSAnimation) => {
  const effect = animation.effect as KeyframeEffect | null
  const track = effect?.target as HTMLElement | null
  const duration = Number(effect?.getTiming().duration) || 0
  const half = (track?.getBoundingClientRect().width ?? 0) / 2
  if (!duration || !half) return () => 0
  // `from translateX(-50%)` → the content moves right as time advances; otherwise it moves left.
  const first = effect?.getKeyframes()[0]?.transform
  const direction = typeof first === 'string' && /-50%/.test(first) ? 1 : -1
  return (px: number) => (direction * px * duration) / half
}

/** Shift an infinite animation by `deltaMs`, wrapped into [0, duration) so it never lands in
 *  the "before" phase (negative time would snap the track to the first keyframe). */
const shiftTime = (animation: CSSAnimation, deltaMs: number) => {
  const duration = Number((animation.effect as KeyframeEffect | null)?.getTiming().duration) || 0
  if (!duration) return
  const current = Number(animation.currentTime) || 0
  let next = (current + deltaMs) % duration
  if (next < 0) next += duration
  animation.currentTime = next
}

export function useMarqueeHoverEase(
  ref: RefObject<HTMLElement | null>,
  { drag = false }: { drag?: boolean } = {},
) {
  const rate = useRef(1)
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Re-queried whenever a ramp/drag starts, so a re-created animation (class change,
    // remount) is picked up instead of a stale handle.
    let animations: CSSAnimation[] = []
    const apply = (value: number) => {
      for (const animation of animations) animation.playbackRate = value
    }
    const cancelRamp = () => {
      if (raf.current != null) cancelAnimationFrame(raf.current)
      raf.current = null
    }

    /** Ease the rate from wherever it is now to `to` over `duration` ms. A ramp started
     *  mid-way (pointer leaves while still braking) simply takes over from the current rate. */
    const rampTo = (to: number, duration: number) => {
      animations = marqueeAnimations(el)
      if (animations.length === 0) return
      cancelRamp()
      const from = rate.current
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        rate.current = from + (to - from) * easeInOut(t)
        apply(rate.current)
        raf.current = t < 1 ? requestAnimationFrame(tick) : null
      }
      raf.current = requestAnimationFrame(tick)
    }

    // ---- drag to browse ------------------------------------------------------------------
    let pointerId: number | null = null
    let dragging = false
    let startX = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0 // px/ms, smoothed
    let inertiaRaf: number | null = null
    let convert: (px: number) => number = () => 0

    const stopInertia = () => {
      if (inertiaRaf != null) cancelAnimationFrame(inertiaRaf)
      inertiaRaf = null
    }
    const shiftBy = (px: number) => {
      const ms = convert(px)
      for (const animation of animations) shiftTime(animation, ms)
    }
    const runInertia = () => {
      stopInertia()
      let prev = performance.now()
      const tick = (now: number) => {
        const dt = now - prev
        prev = now
        shiftBy(velocity * dt)
        velocity *= Math.pow(FRICTION, dt / 16)
        inertiaRaf = Math.abs(velocity) < INERTIA_MIN ? null : requestAnimationFrame(tick)
      }
      inertiaRaf = requestAnimationFrame(tick)
    }

    const onDown = (event: PointerEvent) => {
      if (!drag || event.pointerType !== 'mouse' || event.button !== 0) return
      animations = marqueeAnimations(el)
      if (animations.length === 0) return
      stopInertia()
      pointerId = event.pointerId
      dragging = false
      startX = lastX = event.clientX
      lastT = event.timeStamp
      velocity = 0
      convert = pxToMs(animations[0]!)
      // Freeze right away (skipping the rest of the hover ramp) so the cards follow the hand.
      cancelRamp()
      rate.current = 0
      apply(0)
      el.setPointerCapture(event.pointerId)
      // No text selection / native image drag while sliding.
      event.preventDefault()
    }
    const onMove = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      const dx = event.clientX - lastX
      if (!dragging && Math.abs(event.clientX - startX) < DRAG_SLOP) return
      if (!dragging) {
        dragging = true
        el.style.cursor = 'grabbing'
      }
      const dt = Math.max(1, event.timeStamp - lastT)
      velocity = Math.max(-3, Math.min(3, 0.75 * velocity + 0.25 * (dx / dt)))
      lastX = event.clientX
      lastT = event.timeStamp
      shiftBy(dx)
    }
    const onUp = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
      pointerId = null
      el.style.cursor = ''
      if (!dragging) return
      dragging = false
      // Momentum only if the hand was still moving on release.
      if (event.timeStamp - lastT < 80 && Math.abs(velocity) >= INERTIA_MIN) runInertia()
    }

    // ---- hover ---------------------------------------------------------------------------
    const onEnter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') rampTo(0, STOP_MS)
    }
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') rampTo(1, RESUME_MS)
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    if (drag) {
      el.addEventListener('pointerdown', onDown)
      el.addEventListener('pointermove', onMove)
      el.addEventListener('pointerup', onUp)
      el.addEventListener('pointercancel', onUp)
    }
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      cancelRamp()
      stopInertia()
      el.style.cursor = ''
      rate.current = 1
      apply(1)
    }
  }, [ref, drag])
}

/** Wrapper for server-rendered strips (PartnersStrip): the eased hover pause on a plain div. */
export function MarqueeHoverPause({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useMarqueeHoverEase(ref)
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
