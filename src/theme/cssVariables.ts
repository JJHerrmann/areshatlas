import { tokens } from "@/src/theme/tokens";

function entriesToCssVars(
  prefix: string,
  value: unknown,
  lines: string[],
): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entriesToCssVars(`${prefix}-${index}`, item, lines);
    });
    return;
  }

  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      entriesToCssVars(`${prefix}-${key}`, nested, lines);
    }
    return;
  }

  lines.push(`  --${prefix}: ${String(value)};`);
}

export function getThemeCssVariables(): string {
  const lines = [":root {"];

  entriesToCssVars("token-breakpoint", tokens.breakpoints, lines);
  entriesToCssVars("token-font-family", tokens.fontFamilies, lines);
  entriesToCssVars("token-font-weight", tokens.fontWeights, lines);
  entriesToCssVars("token-line-height", tokens.lineHeights, lines);
  entriesToCssVars("token-letter-spacing", tokens.letterSpacing, lines);
  entriesToCssVars("token-color-primitive", tokens.colors.primitive, lines);
  entriesToCssVars("token-color-semantic", tokens.colors.semantic, lines);
  entriesToCssVars("token-spacing", tokens.spacing, lines);
  entriesToCssVars("token-radius", tokens.radius, lines);
  entriesToCssVars("token-border-width", tokens.borderWidth, lines);
  entriesToCssVars("token-shadow", tokens.shadows, lines);
  entriesToCssVars("token-opacity", tokens.opacity, lines);
  entriesToCssVars("token-motion-duration", tokens.motion.duration, lines);
  entriesToCssVars("token-motion-easing", tokens.motion.easing, lines);
  entriesToCssVars("token-z-index", tokens.zIndex, lines);
  entriesToCssVars("token-layout-max-width", tokens.layout.maxWidth, lines);
  entriesToCssVars("token-layout-columns", tokens.layout.columns, lines);
  entriesToCssVars("token-layout-rails", tokens.layout.rails, lines);
  entriesToCssVars("token-layout-gaps", tokens.layout.gaps, lines);
  entriesToCssVars("token-layout-padding", tokens.layout.padding, lines);
  entriesToCssVars("token-layout-sticky", tokens.layout.sticky, lines);
  entriesToCssVars("token-typography-roles", tokens.typography.roles, lines);
  entriesToCssVars("token-semantic-headings", tokens.semantic.headings, lines);
  entriesToCssVars("token-semantic-spacing", tokens.semantic.spacing, lines);
  entriesToCssVars("token-semantic-relationships", tokens.semantic.relationships, lines);
  entriesToCssVars("token-interaction-transition", tokens.interaction.transition, lines);
  entriesToCssVars("token-interaction-states", tokens.interaction.states, lines);
  entriesToCssVars("token-components", tokens.components, lines);

  lines.push('  --theme-texture-image: url("/textures/black-paper.png");');
  lines.push(
    "  --theme-cloud-gradient: radial-gradient(circle at 16% 12%, var(--token-color-primitive-gold-500) 0%, transparent 28%), radial-gradient(circle at 82% 18%, var(--token-color-primitive-blue-500) 0%, transparent 26%), radial-gradient(circle at 58% 72%, var(--token-color-primitive-red-600) 0%, transparent 32%);",
  );
  lines.push(
    "  --theme-page-gradient: linear-gradient(180deg, var(--token-color-semantic-bg-page) 0%, var(--token-color-semantic-bg-canvas) 45%, var(--token-color-semantic-bg-surface) 100%);",
  );
  lines.push(
    "  --theme-panel-gradient: linear-gradient(180deg, color-mix(in srgb, var(--token-color-semantic-bg-surfaceRaised) 92%, black 8%), color-mix(in srgb, var(--token-color-semantic-bg-surface) 94%, black 6%));",
  );
  lines.push(
    "  --theme-panel-overlay: linear-gradient(rgba(12, 16, 22, 0.82), rgba(12, 16, 22, 0.9));",
  );
  lines.push(
    "  --theme-tab-active-gradient: linear-gradient(180deg, color-mix(in srgb, var(--token-color-primitive-gold-700) 68%, transparent), color-mix(in srgb, var(--token-color-primitive-red-600) 32%, var(--token-color-semantic-bg-surface) 68%));",
  );
  lines.push(
    "  --theme-divider-gradient: linear-gradient(90deg, color-mix(in srgb, var(--token-color-primitive-gold-400) 70%, transparent), transparent);",
  );
  lines.push("}");

  return lines.join("\n");
}
