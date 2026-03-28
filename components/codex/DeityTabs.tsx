"use client";

import { useEffect, useState } from "react";

type DeityTabItem = {
  id: string;
  title: string;
};

type DeityTabsProps = {
  items: DeityTabItem[];
};

function getActiveSectionId(items: DeityTabItem[]): string {
  if (typeof window === "undefined") {
    return items[0]?.id ?? "";
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash && items.some((item) => item.id === hash)) {
    return hash;
  }

  return items[0]?.id ?? "";
}

export default function DeityTabs({ items }: DeityTabsProps) {
  const [activeId, setActiveId] = useState(() => getActiveSectionId(items));

  useEffect(() => {
    setActiveId(getActiveSectionId(items));
  }, [items]);

  useEffect(() => {
    if (!items.length) return;

    const handleHashChange = () => {
      const nextId = getActiveSectionId(items);
      if (nextId) {
        setActiveId(nextId);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);

    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) {
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (!visibleEntries.length) return;

        const nextId = visibleEntries[0]?.target.id;
        if (nextId) {
          setActiveId(nextId);
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0.15, 0.3, 0.5, 0.7],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      observer.disconnect();
    };
  }, [items]);

  return (
    <nav className="codex-deity-tabs" aria-label="Deity sections">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={`codex-deity-tab${item.id === activeId ? " is-active" : ""}`}
          aria-current={item.id === activeId ? "true" : undefined}
          onClick={() => setActiveId(item.id)}
        >
          {item.title}
        </a>
      ))}
    </nav>
  );
}
