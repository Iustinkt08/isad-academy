import fs from 'fs'
import path from 'path'

/**
 * Unde stau fișierele încărcate (`media/`).
 *
 * Calea NU se mai deduce din `process.cwd()`. Sub Passenger, aplicația pornește cu directorul
 * curent = home-ul contului (`/home/isadacad`), nu rădăcina aplicației
 * (`/home/isadacad/apps/isad`) — deci `cwd + "/media"` arăta spre un folder inexistent, iar
 * TOATE fișierele răspundeau 404 în producție: blogul fără imagini, în listă și în articol.
 * Local nu se vedea, pentru că `npm run dev` rulează chiar din rădăcina proiectului, unde
 * cele două coincid (diagnosticat 2026-08-07).
 *
 * Ordinea de rezolvare, de la cel mai explicit la cel mai general:
 *
 *   1. `PAYLOAD_MEDIA_DIR` — portița de scăpare: dacă hostingul mai mută ceva, se rezolvă
 *      dintr-o variabilă de mediu, fără rebuild.
 *   2. directorul lui `server.js` — în bundle-ul standalone, `process.argv[1]` e chiar
 *      `<rădăcina aplicației>/server.js`. E singurul reper care nu depinde nici de cwd, nici
 *      de `__dirname` (care în standalone indică `.next/server/`, de unde eșecul din iulie).
 *   3. `process.cwd()` — corect în dezvoltare și la scripturi rulate din rădăcina proiectului.
 */
export const resolveUploadsDir = (): string => {
  const fromEnv = process.env.PAYLOAD_MEDIA_DIR?.trim()
  if (fromEnv) return path.resolve(fromEnv)

  const entry = process.argv[1]
  if (entry && path.basename(entry) === 'server.js') {
    return path.resolve(path.dirname(entry), 'media')
  }

  return path.resolve(process.cwd(), 'media')
}

/**
 * Zgomot deliberat la pornire. Un director greșit nu dă nicio eroare la boot — se manifestă
 * abia ca imagini lipsă pe site, ceea ce e greu de legat de cauză. Mai bine o linie în log
 * de fiecare dată decât încă o vânătoare.
 */
export const uploadsDir = ((): string => {
  const dir = resolveUploadsDir()
  try {
    if (!fs.existsSync(dir)) {
      console.warn(
        `[media] Directorul de uploads NU există: ${dir}. Fișierele încărcate vor răspunde 404. ` +
          `Setează PAYLOAD_MEDIA_DIR dacă locația reală e alta.`,
      )
    }
  } catch {
    // Verificarea e doar diagnostic — o eroare de acces la disc nu are voie să oprească boot-ul.
  }
  return dir
})()
