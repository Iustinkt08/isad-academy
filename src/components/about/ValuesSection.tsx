/**
 * About / Our Values — v2, sincronizat cu modificările owner-ului din Figma
 * (node 3873-94 → „Section / Our Values", carduri noi 3891:3089+).
 * Valori EXPLICITE (px/hex). Server component.
 *
 * Diferențe față de v1:
 *  — carduri 346.67×260 FIXE (egale prin design, nu prin stretch);
 *  — CHECKMARK cu stroke gradient (#1C5D99→#407EA2, 3px, capete rotunde)
 *    în loc de bulina gradient;
 *  — titlu 20/30 Medium −0.8 #222222; body Poppins LIGHT (300) 14/23 #000000;
 *  — umbră unică 3/9/20 rgba(77,77,77,0.03) + bordură 6px #F6F6F6, radius 24;
 *  — pe HOVER: glow albastru blurat (gradient #1C5D99→#407EA2, blur mare)
 *    care urcă de sub marginea de jos a cardului (în Figma: vizibil pe cardul 1
 *    ca preview al stării de hover; ascuns pe cardurile 2–3 = starea default).
 *
 * ⚠️ Poppins trebuie încărcat și cu greutatea 300 (Light) în next/font.
 */

const VALUES: { title: string; body: string }[] = [
  {
    title: 'We curate with purpose.',
    body: 'We value innovation and progress; these rarely occur without intention. At isad.academy, we design learning paths based on your objectives and starting level.',
  },
  {
    title: 'We teach with clarity.',
    body: 'Complex subjects need clear, coherent journeys. Everything you find on our learning paths has been carefully designed to enrich your learning experience.',
  },
  {
    title: 'We evolve with the world.',
    body: 'We are constantly connected to the world’s movement and chatter. We analyze trends; we know what is next and we are preparing for it.',
  },
];

/** Checkmark 16×16 — stroke gradient #1C5D99→#407EA2, 3px, capete rotunde */
function GradientCheck() {
  return (
    <svg
      aria-hidden
      width="17"
      height="17"
      viewBox="0 0 17 17"
      fill="none"
      className="relative ml-[5px]"
    >
      <path
        d="M2.5 9L6.5 13L14.5 4"
        stroke="url(#vc-grad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="vc-grad"
          x1="2.5"
          y1="13"
          x2="14.5"
          y2="4"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1C5D99" />
          <stop offset="1" stopColor="#407EA2" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function ValuesSection() {
  return (
    <section className="flex flex-col items-center gap-11 bg-[#f8f9fa] pb-[30px] pt-[70px]">
      {/* Titlu — 44/48.4, „values." în gradient */}
      <h2 className="text-center text-[44px] font-semibold leading-[48.4px] tracking-[-1.5px] text-[#222222]">
        Our{' '}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          values.
        </span>
      </h2>

      {/* Rând — carduri fixe 346.67×260, gap 30. flex-wrap: identic la desktop
          (toate 3 încap); sub lg cardurile coboară pe rânduri noi în loc să dea
          scroll orizontal întregii pagini. */}
      <div className="flex flex-wrap justify-center gap-[30px]">
        {VALUES.map((v) => (
          <article
            key={v.title}
            className="group relative h-[260px] w-[346.67px] overflow-hidden rounded-[24px] border-[6px] border-[#f6f6f6] bg-white pl-9 pr-4 pt-[41px] shadow-[3px_9px_20px_rgba(77,77,77,0.03)]"
          >
            {/* Glow albastru pe hover — blob gradient blurat care urcă de jos */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-[-38px] left-[6px] right-[6px] h-[89px] rounded-full bg-[linear-gradient(90deg,#1c5d99_24%,#407ea2_83%)] opacity-0 blur-[55px] transition-opacity duration-300 group-hover:opacity-100"
            />

            <GradientCheck />
            <h3 className="relative text-[20px] font-medium leading-[30px] tracking-[-0.8px] text-[#222222]">
              {v.title}
            </h3>
            <p className="relative mt-3 w-[248px] text-[14px] font-light leading-[23px] text-[#000000]">
              {v.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
