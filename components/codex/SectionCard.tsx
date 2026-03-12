import Link from "next/link";

type SectionCardProps = {
  title: string;
  label: string;
  summary: string;
  href: string;
  countLabel?: string;
};

export default function SectionCard({ title, label, summary, href, countLabel }: SectionCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-sm border border-amber-300 bg-amber-100/90 p-5 shadow-folio transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <article>
        <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700">{label}</p>
        <h3 className="mt-2 font-display text-xl text-amber-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-amber-950/85">{summary}</p>
        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-amber-800">
          <span>Open Section</span>
          <span>{countLabel ?? "Survey Pending"}</span>
        </div>
      </article>
    </Link>
  );
}
