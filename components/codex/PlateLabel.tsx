type PlateLabelProps = {
  children: React.ReactNode;
};

export default function PlateLabel({ children }: PlateLabelProps) {
  return (
    <p className="codex-plate-label inline-block border border-amber-500/60 px-3 py-1 text-xs uppercase tracking-[0.28em] text-amber-800">
      {children}
    </p>
  );
}
