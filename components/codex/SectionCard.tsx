type SectionCardProps = {
  title: string;
  label: string;
  summary: string;
};

export default function SectionCard({ title, label, summary }: SectionCardProps) {
  return (
    <article className="rounded-sm border border-amber-300 bg-amber-100/90 p-5 shadow-folio transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[10px] uppercase tracking-[0.22em] text-amber-700">{label}</p>
      <h3 className="mt-2 font-display text-xl text-amber-900">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-amber-950/85">{summary}</p>
    </article>
  );
}
