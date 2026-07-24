/**
 * `orders.session` is a `relationship` field: depending on the `depth` the triggering
 * operation used, hooks may see either the raw id or a populated document. Hooks must
 * handle both — this normalizes either shape down to the id.
 */
export const extractRelationshipId = (value: unknown): number | string | undefined => {
  if (value == null) return undefined
  if (typeof value === 'object') return (value as { id?: number | string }).id
  return value as number | string
}
