import Link from "next/link";

type EntryCardProps = {
  title: string;
  domain: string;
  summary: string;
  imageSrc?: string;
  href?: string;
  kind?: "folder" | "file";
};

function renderInlineSummary(summary: string) {
  const parts = summary.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={`strong-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={`em-${index}`}>{part.slice(1, -1)}</em>;
    }
    return <span key={`text-${index}`}>{part}</span>;
  });
}

export default function EntryCard({ title, domain, summary, imageSrc, href, kind = "file" }: EntryCardProps) {
  const body = (
    <article
      className="relative overflow-hidden border border-stone-300 bg-amber-50/70 p-4"
      style={{
        backgroundImage: imageSrc
          ? `linear-gradient(rgba(252, 247, 236, 0.82), rgba(245, 235, 214, 0.82)), url("${imageSrc}")`
          : undefined,
        backgroundSize: imageSrc ? "cover" : undefined,
        backgroundPosition: imageSrc ? "center" : undefined,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(120,93,50,0.06) 100%)",
          opacity: imageSrc ? 1 : 0,
        }}
      />
      <p className="relative text-[10px] uppercase tracking-[0.2em] text-stone-600">
        {kind === "folder" ? "Survey Division" : "Recorded Entry"} | {domain}
      </p>
      <h4 className="relative mt-2 font-display text-lg text-stone-900">{title}</h4>
      <p className="relative mt-2 text-sm leading-6 text-stone-800/85">{renderInlineSummary(summary)}</p>
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
