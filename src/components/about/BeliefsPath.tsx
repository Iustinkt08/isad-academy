import type { ReactNode } from 'react';

/**
 * About / Beliefs Path — cele 3 crezuri ca WAYPOINTS pe o linie gradient
 * („traseul de navigație"), cu un waypoint GOL la capăt = „what comes next".
 * 1:1 cu Figma 3873-94 → „Section / Beliefs". Valori EXPLICITE (px/hex).
 * Server component. Layout de DESKTOP (lățime fixă 1160) — varianta mobilă
 * se face separat, după design; sub lg secțiunea își taie overflow-ul orizontal.
 *
 * Geometrie (din Figma): 3 coloane de 360px cu gap 40 → canvas 1160;
 * linia 920×3 pornește din centrul primului cerc (x=180, y=20.5) și continuă
 * până la waypoint-ul gol (x=1092, y=14, 16px). Cercurile 44px acoperă linia.
 */

const BELIEFS: { num: string; lead: string; tail: string }[] = [
  { num: '1', lead: 'We believe in ', tail: 'innovation.' },
  { num: '2', lead: 'We are guided by ', tail: 'structure.' },
  { num: '3', lead: 'We help you stay ready for ', tail: 'what comes next.' },
];

/** Inelul gradient al brandului, în formă de cerc (construcția PillTag) */
function RingCircle({
  size,
  ring,
  children,
}: {
  size: number;
  ring: number;
  children?: ReactNode;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)]"
      style={{ width: size, height: size, padding: ring }}
    >
      <span className="flex size-full items-center justify-center rounded-full bg-white">
        {children}
      </span>
    </span>
  );
}

export default function BeliefsPath() {
  return (
    <section className="flex flex-col items-center gap-9 overflow-x-clip bg-[#f8f9fa] pb-11 pt-10">
      {/* Subtitlu — Poppins SemiBold 24, #407EA2 (v2: înlocuiește micro-kicker-ul uppercase) */}
      <h2 className="text-center text-[24px] font-semibold leading-9 text-[#407ea2]">
        What guides us
      </h2>

      {/* Traseul: linia gradient în spate + 3 coloane cu waypoints */}
      <div className="relative flex w-[1160px] gap-10">
        {/* Linia gradient — pornește din centrul cercului 1, continuă după cercul 3 */}
        <div
          aria-hidden
          className="absolute left-[180px] top-[20.5px] h-[3px] w-[920px] rounded-[2px] bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_55%,#46d3f6_100%)]"
        />
        {/* Waypoint GOL la capătul liniei — următorul punct, încă neatins.
            Inel SOLID #46D3F6 = culoarea de la finalul liniei (nu gradientul de brand). */}
        <span
          aria-hidden
          className="absolute left-[1092px] top-[14px] flex size-4 items-center justify-center rounded-full bg-[#46d3f6] p-[3px]"
        >
          <span className="size-full rounded-full bg-white" />
        </span>

        {BELIEFS.map((b) => (
          <div key={b.num} className="relative flex w-[360px] flex-col items-center gap-[18px]">
            <RingCircle size={44} ring={3}>
              <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-[15px] font-semibold text-transparent">
                {b.num}
              </span>
            </RingCircle>
            <p className="text-center text-[21px] font-medium leading-[30px] tracking-[-0.6px] text-[#222222]">
              {b.lead}
              <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
                {b.tail}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
