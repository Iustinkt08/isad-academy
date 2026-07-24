import Link from 'next/link';

/**
 * About / CTA final — întrebarea de închidere + butonul pill gradient spre /cursuri.
 * 1:1 cu Figma 3873-94 → „Section / About CTA". Valori EXPLICITE (px/hex).
 * Server component.
 */

export default function AboutCta({
  line = 'Ready to move in step with what’s next?',
  ctaLabel = 'Explore our courses →',
  ctaHref = '/cursuri',
}: {
  line?: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <section className="flex flex-col items-center gap-[22px] bg-[#f8f9fa] pb-[100px] pt-[30px]">
      <p className="text-center text-[22px] font-medium tracking-[-0.5px] text-[#222222]">
        {line}
      </p>
      <Link
        href={ctaHref}
        className="rounded-[999px] bg-gradient-to-b from-[#407ea2] to-[#1c5d99] to-[80%] px-5 pb-3 pt-[11px] text-[16px] font-medium leading-normal text-white shadow-[0_4px_4px_-2px_rgba(0,0,0,0.21)] transition-transform hover:scale-[1.03]"
      >
        {ctaLabel}
      </Link>
    </section>
  );
}
