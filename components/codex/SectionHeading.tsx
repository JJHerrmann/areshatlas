type SectionHeadingProps = {
  id: string;
  title: string;
};

export default function SectionHeading({ id, title }: SectionHeadingProps) {
  return (
    <h2
      id={id}
      data-outline-target="true"
      data-outline-level="2"
      data-outline-label={title}
      className="codex-deity-section-title"
    >
      {title}
    </h2>
  );
}
