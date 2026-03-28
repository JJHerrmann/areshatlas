"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SearchItem = {
  title: string;
  href: string | null;
  section: string;
  aliases?: string[];
};

type GlobalSearchProps = {
  items: SearchItem[];
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function GlobalSearch({ items }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const options = useMemo(
    () =>
      items
        .filter((item) => item.href)
        .map((item) => ({
          label: `${item.title} (${item.section})`,
          title: item.title,
          href: item.href as string,
          aliases: item.aliases ?? [],
        })),
    [items],
  );

  const listId = "codex-global-search-options";

  const submit = () => {
    const cleanQuery = normalize(query);
    if (!cleanQuery) return;

    const exact = options.find(
      (item) =>
        normalize(item.title) === cleanQuery ||
        item.aliases.some((alias) => normalize(alias) === cleanQuery) ||
        normalize(item.label) === cleanQuery,
    );
    const partial = options.find(
      (item) =>
        normalize(item.title).includes(cleanQuery) ||
        item.aliases.some((alias) => normalize(alias).includes(cleanQuery)) ||
        normalize(item.label).includes(cleanQuery),
    );

    const target = exact ?? partial;
    if (target) {
      router.push(target.href);
    }
  };

  return (
    <div className="codex-global-search">
      <label className="sr-only" htmlFor="codex-global-search-input">
        Search the codex
      </label>
      <input
        id="codex-global-search-input"
        className="codex-global-search-input"
        type="search"
        list={listId}
        value={query}
        placeholder="Search the codex..."
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
      />
      <button type="button" className="codex-global-search-button" onClick={submit}>
        Search
      </button>
      <datalist id={listId}>
        {options.map((item) => (
          <option key={item.href} value={item.title}>
            {item.label}
          </option>
        ))}
      </datalist>
    </div>
  );
}
