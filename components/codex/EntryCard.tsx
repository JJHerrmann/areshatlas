type EntryCardProps = {
  title: string;
  domain: string;
  summary: string;
};

export default function EntryCard({ title, domain, summary }: EntryCardProps) {
  return (
    <article className="border border-stone-300 bg-amber-50/70 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600">Recorded Entry | {domain}</p>
      <h4 className="mt-2 font-display text-lg text-stone-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-stone-800/85">{summary}</p>
    </article>
  );
}
