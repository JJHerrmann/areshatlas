import Link from "next/link";

type EntryCardProps = {
  title: string;
  domain: string;
  summary: string;
  href?: string;
  kind?: "folder" | "file";
};

export default function EntryCard({ title, domain, summary, href, kind = "file" }: EntryCardProps) {
  const body = (
    <article className="border border-stone-300 bg-amber-50/70 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
        {kind === "folder" ? "Survey Division" : "Recorded Entry"} | {domain}
      </p>
      <h4 className="mt-2 font-display text-lg text-stone-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-stone-800/85">{summary}</p>
    </article>
  );

  if (!href) {
    return body;
  }

  return (
    <Link href={href} className="block transition hover:border-amber-500/70 hover:bg-amber-50/90">
      {body}
    </Link>
  );
}
