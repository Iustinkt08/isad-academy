import { asMedia } from '../courses/helpers'
import { MediaImage } from '../media/MediaImage'
import type { CorporateClient } from '@/payload-types'

/**
 * Corporate-clients logo strip for the /corporate hero bottom (§6). Sits on the dark
 * gradient hero, so text fallbacks use ice tones. Logos are optional per client; a name-only
 * entry renders as text. Renders nothing when the collection is empty.
 */
export function LogoStrip({ clients }: { clients: CorporateClient[] }) {
  if (clients.length === 0) return null

  return (
    <div data-testid="corporate-logo-strip">
      <p className="text-small font-semibold uppercase tracking-wider text-ice/70">
        Teams we&rsquo;ve trained
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-5">
        {clients.map((client) => {
          const logo = asMedia(client.logo)
          const content = logo ? (
            <MediaImage media={logo} className="h-8 w-auto object-contain" sizes="140px" />
          ) : (
            <span className="text-base font-bold tracking-tight text-ice/80">{client.name}</span>
          )
          return (
            <li key={client.id}>
              {client.url ? (
                <a
                  href={client.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={client.name}
                  className="block opacity-80 transition-opacity duration-200 hover:opacity-100"
                >
                  {content}
                </a>
              ) : (
                <span className="block opacity-80">{content}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
