/**
 * Gods renamed to their Xibanal names (2026-10-17). Routes come from the note
 * title, so the old pages lived at /pantheon/<old-name>; keep them resolving.
 */
const renamedGods: Array<[string, string]> = [
  ["abyroqa", "nisaya"],
  ["bolohua", "tohamaya"],
  ["derequi", "daarakaya"],
  ["gozara", "giralaya"],
  ["harbaal", "hoorhuaya"],
  ["kadashar", "gooxamaya"],
  ["kathorharab", "lichamaya"],
  ["kaxatzin", "xichataya"],
  ["kevarotzin", "qibaraya"],
  ["kinayotl", "ibalaya"],
  ["kvaritzin", "xilaya"],
  ["leyala", "yoorachaya"],
  ["lotan", "noochaxaya"],
  ["maavacihuatl", "nipaxaya"],
  ["malagad", "lookaya"],
  ["marmoqed", "roopaya"],
  ["masehua", "ooxaraya"],
  ["moxilaxaya", "sidaraya"],
  ["niwara", "aavaraya"],
  ["qatzera", "qootzaraya"],
  ["raavvah", "ribaya"],
  ["refapilli", "oovabaya"],
  ["rexaya", "rooxaya"],
  ["tahiwaco", "tahavaya"],
  ["tehontecuhtli", "chooxakaya"],
  ["temaya", "toomamaya"],
  ["tsayidrah", "tzivadaya"],
  ["xefahua", "xipaya"],
  ["xochbaram", "sooraya"],
  ["yamnahar", "yoonhuaya"],
  ["yaradaat", "yoodaya"],
  ["yatbara", "baaraya"],
  ["yekala", "mizalaya"],
  ["zemana", "zimanaya"],
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      ...renamedGods.map(([from, to]) => ({
        source: `/pantheon/${from}/:rest*`,
        destination: `/pantheon/${to}/:rest*`,
        permanent: true,
      })),
      {
        source: "/pantheon/myths/the-binding-of-niwara/:rest*",
        destination: "/pantheon/myths/the-binding-of-aavaraya/:rest*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
