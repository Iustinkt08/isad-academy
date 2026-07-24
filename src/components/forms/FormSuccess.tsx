import { GlassPanel } from '../ui/GlassPanel'

/**
 * The panel that REPLACES a lead form after a successful submission (§6 — thank-you
 * without response-time promises). `role="status"` announces the swap to screen readers.
 */
export function FormSuccess({ title, message }: { title: string; message: string }) {
  return (
    <GlassPanel className="p-8" data-testid="form-success">
      <div role="status">
        <h3 className="text-h4 text-ink">{title}</h3>
        <p className="mt-2 text-body text-ink/70">{message}</p>
      </div>
    </GlassPanel>
  )
}
