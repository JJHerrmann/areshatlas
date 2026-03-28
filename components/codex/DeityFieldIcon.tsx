type DeityFieldIconProps = {
  label: string;
};

const iconByLabel: Record<string, string> = {
  Pantheon: "ra-ankh",
  Title: "ra-crown",
  "Honorific Title": "ra-scroll-unfurled",
  Gender: "ra-player",
  Avatar: "ra-player-teleport",
  "Consort(s)": "ra-two-hearts",
  Allies: "ra-shield",
  Foes: "ra-crossed-swords",
  Rank: "ra-crown-of-thorns",
  Nature: "ra-moon-sun",
  Ethos: "ra-radial-balance",
  "Major Influence": "ra-crystal-ball",
  "Minor Influence(s)": "ra-crystals",
  Spheres: "ra-orb-wand",
  Parents: "ra-family-tree",
  Siblings: "ra-trefoil-lily",
  Offspring: "ra-sprout",
  "Dwelling Place": "ra-tower",
  "Primary Symbol": "ra-rune-stone",
  "Secondary Symbols": "ra-gem-pendant",
  "Sacred Number": "ra-dice-six",
  "Sacred Colors": "ra-gem",
  "Forbidden Colors": "ra-fire-symbol",
  "Sacred Stones": "ra-sapphire",
  "Sacred Objects": "ra-relic-blade",
  "Sacred Weapons": "ra-spiked-mace",
  "Church Name": "ra-temple",
  "Central Authority": "ra-capitol",
  "Regional Titles": "ra-queen-crown",
  "Temple Titles": "ra-temple",
  "Clergy Titles": "ra-hood",
  "Religious Orders": "ra-knight-helmet",
  "Holy Texts": "ra-book",
  Apocrypha: "ra-scroll-unfurled",
  "Holy Days": "ra-hourglass",
  Taboos: "ra-cancel",
  Virtues: "ra-sun-symbol",
  Vices: "ra-fire",
};

export default function DeityFieldIcon({ label }: DeityFieldIconProps) {
  const icon = iconByLabel[label];
  if (!icon) return null;
  return <i className={`ra ${icon} codex-field-icon`} aria-hidden="true" />;
}
