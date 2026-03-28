"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type OutlineItem = {
  id: string;
  text: string;
  level: number;
};

function collectOutlineItems(): OutlineItem[] {
  if (typeof document === "undefined") return [];

  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(
      ".codex-entry-body [data-outline-target='true'], .codex-entry-body h2[id], .codex-entry-body h3[id]",
    ),
  );

  return nodes
    .map((node) => ({
      id: node.id,
      text: (node.dataset.outlineLabel || node.textContent || "").trim(),
      level: Number(node.dataset.outlineLevel || node.tagName.replace(/[^0-9]/g, "") || "2"),
    }))
    .filter((item) => item.id && item.text);
}

export default function ArticleOutlineNav() {
  const pathname = usePathname();
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextItems = collectOutlineItems();
      setItems(nextItems);
      setActiveId(window.location.hash.replace(/^#/, "") || nextItems[0]?.id || "");
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!items.length) return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        setActiveId(hash);
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0.15, 0.35, 0.6],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      observer.disconnect();
    };
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="wiki-box codex-outline-box">
      <h3 className="wiki-box-title">On This Page</h3>
      <nav className="codex-article-outline-nav" aria-label="Article outline">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`codex-article-outline-link${activeId === item.id ? " is-active" : ""}${item.level > 2 ? " is-sub" : ""}`}
            aria-current={activeId === item.id ? "true" : undefined}
          >
            {item.text}
          </a>
        ))}
      </nav>
    </section>
  );
}
