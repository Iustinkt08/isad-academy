/**
 * About / Hero — pill „About us" + titlu cu gradient + misiunea + linia de fondare.
 * 1:1 cu Figma 3873-94 → „Section / About Hero". Valori EXPLICITE (px/hex).
 * Server component (fără stare).
 */

/** Pill cu inel gradient — construcția PillTag: inel 3px, interior alb, text 15/23 */
function GradientPill({ label }: { label: string }) {
  return (
    <span className="w-fit shrink-0 rounded-[26px] bg-[linear-gradient(90deg,#1c5d99_0%,#46d3f6_25%,#1c5d99_50%,#46d3f6_75%,#1c5d99_100%)] p-[3px]">
      <span className="flex items-center whitespace-nowrap rounded-[23px] bg-white px-4 py-[2px] text-[15px] font-medium leading-[23px] text-black">
        {label}
      </span>
    </span>
  );
}

export default function AboutHero() {
  return (
    <section className="flex flex-col items-center gap-[26px] bg-[#f8f9fa] px-4 pb-[50px] pt-[100px]">
      <GradientPill label="About us" />

      {/* Titlu — Poppins SemiBold 54/59.4, „changing world." în gradient */}
      <h1 className="max-w-[1000px] text-center text-[54px] font-semibold leading-[59.4px] tracking-[-1.5px] text-[#222222]">
        Your navigation instrument for a{' '}
        <span className="bg-[linear-gradient(90deg,#407ea2_0%,#1c5d99_100%)] bg-clip-text text-transparent">
          changing world.
        </span>
      </h1>

      {/* Intro — 2 paragrafe 16/26 + linia de fondare 14/21 */}
      <div className="flex max-w-[760px] flex-col gap-3.5">
        <p className="text-center text-[16px] leading-[26px] text-[#595959]">
          The world is spinning faster than ever. New technologies emerge, new skills take
          shape, and fresh, flexible perspectives become essential.
        </p>
        <p className="text-center text-[16px] leading-[26px] text-[#595959]">
          isad.academy is, before anything else, your curated navigation instrument for this
          changing world — a course platform designed to help you renew your knowledge,
          strengthen your competencies, and move in step with global policies and evolving
          ISO standards.
        </p>
        <p className="text-center text-[14px] leading-[21px] text-[#959595]">
          Built by International Security and Defence (ISAD) — an official PECB partner.
        </p>
      </div>
    </section>
  );
}
