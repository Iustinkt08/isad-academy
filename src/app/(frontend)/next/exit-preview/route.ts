import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Exit draft preview: clears the Next draft-mode cookie (linked from the preview banner on
 * /blog/[slug]) and returns to the public blog list. Safe for anyone to call — it only
 * ever REMOVES the bypass cookie.
 */
export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()

  redirect('/blog')
}
