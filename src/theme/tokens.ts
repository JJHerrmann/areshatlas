export const tokens = {
  meta: {
    name: "Aresh Codex UI",
    version: "1.0.0",
  },

  breakpoints: {
    xs: 360,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    xxl: 1440,
  },

  fontFamilies: {
    display: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    body: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },

  fontWeights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeights: {
    tight: 1.05,
    snug: 1.2,
    body: 1.68,
    relaxed: 1.8,
  },

  letterSpacing: {
    tight: "-0.02em",
    normal: "0em",
    wide: "0.08em",
    wider: "0.14em",
  },

  colors: {
    primitive: {
      ink: {
        950: "#0B1118",
        900: "#101823",
        850: "#151F2A",
        800: "#1B2531",
        700: "#243140",
      },
      parchment: {
        50: "#F8F2E8",
        100: "#F2DFB5",
        200: "#EAD8B8",
        300: "#D9C39A",
        400: "#C6AB7A",
      },
      gold: {
        300: "#D7B879",
        400: "#C99C56",
        500: "#B78B43",
        600: "#9B7337",
        700: "#7D5B2B",
      },
      blue: {
        400: "#6E8FAE",
        500: "#4F6F8E",
        600: "#3B5872",
      },
      red: {
        500: "#8C4E43",
        600: "#6F3A31",
      },
      green: {
        500: "#58725C",
        600: "#435846",
      },
      alpha: {
        white4: "rgba(255,255,255,0.04)",
        white6: "rgba(255,255,255,0.06)",
        white10: "rgba(255,255,255,0.10)",
        gold12: "rgba(183,139,67,0.12)",
        gold18: "rgba(183,139,67,0.18)",
        gold28: "rgba(183,139,67,0.28)",
        gold45: "rgba(183,139,67,0.45)",
        gold60: "rgba(183,139,67,0.60)",
        blue12: "rgba(79,111,142,0.12)",
        blue20: "rgba(79,111,142,0.20)",
        blue32: "rgba(79,111,142,0.32)",
        blue48: "rgba(79,111,142,0.48)",
      },
    },

    semantic: {
      bg: {
        page: "#0B1118",
        canvas: "#101823",
        surface: "#151F2A",
        surfaceRaised: "#1B2531",
        overlay: "rgba(11,17,24,0.88)",
      },
      text: {
        primary: "#EAD8B8",
        strong: "#F2DFB5",
        muted: "#C6AB7A",
        inverse: "#0B1118",
        link: "#F2DFB5",
        linkHover: "#D7B879",
      },
      border: {
        subtle: "rgba(183,139,67,0.12)",
        default: "rgba(183,139,67,0.28)",
        strong: "rgba(183,139,67,0.45)",
        active: "rgba(183,139,67,0.60)",
      },
      accent: {
        primary: "#B78B43",
        primaryHover: "#C99C56",
        secondary: "#4F6F8E",
        danger: "#8C4E43",
        success: "#58725C",
      },
      decorative: {
        line: "rgba(183,139,67,0.18)",
        glow: "rgba(215,184,121,0.10)",
        textureLight: "rgba(255,255,255,0.04)",
      },
      focus: {
        ring: "0 0 0 2px rgba(183,139,67,0.35)",
      },
    },
  },

  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },

  radius: {
    none: "0px",
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    pill: "9999px",
  },

  borderWidth: {
    none: "0px",
    thin: "1px",
    thick: "2px",
  },

  shadows: {
    none: "none",
    card: "0 4px 16px rgba(0,0,0,0.14)",
    overlay: "0 12px 32px rgba(0,0,0,0.24)",
    focus: "0 0 0 2px rgba(183,139,67,0.35)",
  },

  opacity: {
    disabled: 0.45,
    muted: 0.72,
    subtle: 0.88,
    solid: 1,
  },

  motion: {
    duration: {
      instant: "0ms",
      fast: "120ms",
      normal: "180ms",
      slow: "260ms",
    },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      entrance: "cubic-bezier(0.18, 0.9, 0.32, 1)",
      exit: "cubic-bezier(0.4, 0, 1, 1)",
    },
  },

  zIndex: {
    base: 0,
    content: 10,
    sticky: 100,
    overlay: 400,
    modal: 1000,
    toast: 1200,
  },

  layout: {
    maxWidth: {
      page: "1600px",
      reading: "820px",
      prose: "72ch",
    },
    columns: {
      desktop: "260px minmax(0, 1fr) 320px",
      laptop: "240px minmax(0, 1fr) 300px",
      tablet: "minmax(0, 1fr)",
      mobile: "minmax(0, 1fr)",
    },
    rails: {
      sidebarDesktop: "260px",
      sidebarLaptop: "240px",
      infoDesktop: "320px",
      infoLaptop: "300px",
    },
    gaps: {
      desktop: "24px",
      laptop: "24px",
      tablet: "16px",
      mobile: "16px",
    },
    padding: {
      pageDesktopX: "24px",
      pageDesktopY: "24px",
      pageMobileX: "16px",
      pageMobileY: "16px",
    },
    sticky: {
      topDesktop: "24px",
      topMobile: "16px",
    },
  },

  typography: {
    roles: {
      articleTitle: {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        fontSize: {
          desktop: "56px",
          tablet: "48px",
          mobile: "38px",
        },
        fontWeight: 500,
        lineHeight: 1.05,
        letterSpacing: "-0.02em",
        color: "#F2DFB5",
      },

      articleDek: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "22px",
          tablet: "20px",
          mobile: "18px",
        },
        fontWeight: 400,
        lineHeight: 1.68,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },

      sectionHeading: {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        fontSize: {
          desktop: "36px",
          tablet: "32px",
          mobile: "28px",
        },
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        color: "#F2DFB5",
      },

      cardTitle: {
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
        fontSize: {
          desktop: "20px",
          tablet: "20px",
          mobile: "18px",
        },
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "0em",
        color: "#F2DFB5",
      },

      body: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "18px",
          tablet: "18px",
          mobile: "16px",
        },
        fontWeight: 400,
        lineHeight: 1.68,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },

      bodySmall: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "16px",
          tablet: "16px",
          mobile: "15px",
        },
        fontWeight: 400,
        lineHeight: 1.68,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },

      label: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "12px",
          tablet: "12px",
          mobile: "12px",
        },
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "#C6AB7A",
      },

      navItem: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "17px",
          tablet: "17px",
          mobile: "16px",
        },
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },

      chipText: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "14px",
          tablet: "14px",
          mobile: "13px",
        },
        fontWeight: 500,
        lineHeight: 1.2,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },

      infoLabel: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "11px",
          tablet: "11px",
          mobile: "11px",
        },
        fontWeight: 600,
        lineHeight: 1.2,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "#C6AB7A",
      },

      infoValue: {
        fontFamily: '"Proza Libre", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          desktop: "16px",
          tablet: "16px",
          mobile: "15px",
        },
        fontWeight: 400,
        lineHeight: 1.68,
        letterSpacing: "0em",
        color: "#EAD8B8",
      },
    },
  },

  semantic: {
    headings: {
      h1: "articleTitle",
      h2: "sectionHeading",
      h3: "cardTitle",
    },

    spacing: {
      pageX: "24px",
      pageY: "24px",
      sectionGap: "48px",
      subsectionGap: "32px",
      cardPadding: "16px",
      cardPaddingLarge: "24px",
      chipGap: "8px",
      fieldGap: "12px",
      clusterGap: "16px",
      columnGap: "24px",
      rowGap: "16px",
    },

    relationships: {
      sameCategory: "RelatedEntitiesCard",
      crossCategory: "CrossReferenceChips",
    },
  },

  interaction: {
    transition: {
      background: "120ms cubic-bezier(0.2, 0, 0, 1)",
      border: "120ms cubic-bezier(0.2, 0, 0, 1)",
      color: "120ms cubic-bezier(0.2, 0, 0, 1)",
      transform: "180ms cubic-bezier(0.2, 0, 0, 1)",
      shadow: "120ms cubic-bezier(0.2, 0, 0, 1)",
    },
    states: {
      hoverLift: {
        transform: "translateY(-1px)",
      },
      press: {
        transform: "translateY(0)",
      },
      disabled: {
        opacity: 0.45,
      },
      focus: {
        ring: "0 0 0 2px rgba(183,139,67,0.35)",
      },
    },
  },

  components: {
    appShell: {
      maxWidth: "1600px",
      background: "#0B1118",
      paddingXDesktop: "24px",
      paddingYDesktop: "24px",
      paddingXMobile: "16px",
      paddingYMobile: "16px",
    },

    sidebarRail: {
      widthDesktop: "260px",
      widthLaptop: "240px",
      background: "#151F2A",
      borderColor: "rgba(183,139,67,0.28)",
      borderWidth: "1px",
      padding: "24px",
      gap: "24px",
    },

    topUtilityBar: {
      minHeight: "48px",
      borderBottomColor: "rgba(183,139,67,0.28)",
      borderBottomWidth: "1px",
      paddingBottom: "16px",
      gap: "16px",
    },

    breadcrumbs: {
      gap: "8px",
      separatorColor: "#C6AB7A",
      linkColor: "#C6AB7A",
      linkHoverColor: "#F2DFB5",
      textRole: "label",
    },

    globalSearch: {
      widthDesktop: "320px",
      widthMobile: "100%",
      height: "40px",
      background: "#151F2A",
      borderColor: "rgba(183,139,67,0.28)",
      borderRadius: "6px",
      paddingX: "16px",
      textRole: "bodySmall",
      placeholderColor: "#C6AB7A",
      focusBorderColor: "rgba(183,139,67,0.45)",
      focusRing: "0 0 0 2px rgba(183,139,67,0.35)",
    },

    articleHeader: {
      gap: "12px",
      marginBottom: "24px",
      borderBottomColor: "rgba(183,139,67,0.28)",
      borderBottomWidth: "1px",
      paddingBottom: "24px",
    },

    sectionTabNav: {
      gap: "8px",
      marginTop: "16px",
      marginBottom: "24px",
      overflowMobile: "auto" as const,
      tab: {
        minHeight: "44px",
        paddingX: "16px",
        paddingY: "12px",
        borderRadius: "6px",
        borderWidth: "1px",
        borderColorDefault: "rgba(183,139,67,0.28)",
        borderColorHover: "rgba(183,139,67,0.45)",
        borderColorActive: "rgba(183,139,67,0.45)",
        bgDefault: "transparent",
        bgHover: "rgba(183,139,67,0.12)",
        bgActive: "rgba(42,35,29,0.92)",
        textDefault: "#C6AB7A",
        textHover: "#EAD8B8",
        textActive: "#F2DFB5",
        textRole: "chipText",
      },
    },

    articleBody: {
      maxWidth: "820px",
      sectionGap: "48px",
      subsectionGap: "32px",
    },

    articleSection: {
      gap: "16px",
      scrollMarginTopDesktop: "96px",
      scrollMarginTopMobile: "72px",
      header: {
        gap: "16px",
        dividerColor: "rgba(183,139,67,0.18)",
        dividerThickness: "1px",
        titleRole: "sectionHeading",
      },
    },

    articleOutlineNav: {
      width: "100%",
      background: "#151F2A",
      borderColor: "rgba(183,139,67,0.28)",
      borderWidth: "1px",
      padding: "16px",
      itemGap: "8px",
      itemPaddingY: "8px",
      itemPaddingX: "12px",
      itemTextRole: "bodySmall",
      itemColorDefault: "#C6AB7A",
      itemColorHover: "#EAD8B8",
      itemColorActive: "#F2DFB5",
      itemBgHover: "rgba(183,139,67,0.12)",
      itemBgActive: "rgba(183,139,67,0.18)",
      hiddenBelow: 1024,
    },

    infoRail: {
      widthDesktop: "320px",
      widthLaptop: "300px",
      stickyTopDesktop: "24px",
      moveBelowHeaderAt: 1024,
    },

    card: {
      base: {
        background: "#151F2A",
        borderColor: "rgba(183,139,67,0.28)",
        borderWidth: "1px",
        borderRadius: "6px",
        padding: "16px",
        shadow: "none",
      },

      raised: {
        background: "#1B2531",
        borderColor: "rgba(183,139,67,0.45)",
        borderWidth: "1px",
        borderRadius: "6px",
        padding: "24px",
        shadow: "0 4px 16px rgba(0,0,0,0.14)",
      },
    },

    infoCard: {
      background: "#1B2531",
      borderColor: "rgba(183,139,67,0.45)",
      borderWidth: "1px",
      borderRadius: "6px",
      padding: "24px",
      shadow: "0 4px 16px rgba(0,0,0,0.14)",
      imageAspectRatio: "4 / 3",
      imageBorderBottomColor: "rgba(183,139,67,0.28)",
      titleRole: "cardTitle",
      contentGap: "16px",
      rowGap: "16px",
      rowDividerColor: "rgba(183,139,67,0.18)",
      labelRole: "infoLabel",
      valueRole: "infoValue",
    },

    relatedEntitiesCard: {
      background: "#151F2A",
      borderColor: "rgba(183,139,67,0.28)",
      borderWidth: "1px",
      borderRadius: "6px",
      padding: "16px",
      titleRole: "cardTitle",
      itemGap: "12px",
      itemPadding: "8px",
      itemRadius: "6px",
      itemBgHover: "rgba(183,139,67,0.12)",
      itemBorderHover: "rgba(183,139,67,0.45)",
      thumbSize: "48px",
      thumbRadius: "9999px",
      itemTitleRole: "bodySmall",
      itemSubtitleRole: "label",
    },

    crossReferenceChips: {
      gap: "8px",
      marginTop: "12px",
      marginBottom: "8px",
    },

    chip: {
      base: {
        minHeight: "32px",
        paddingX: "12px",
        paddingY: "8px",
        radius: "9999px",
        borderWidth: "1px",
        textRole: "chipText",
      },

      variants: {
        taxonomy: {
          background: "rgba(183,139,67,0.12)",
          borderColor: "rgba(183,139,67,0.28)",
          textColor: "#EAD8B8",
          hoverBackground: "rgba(183,139,67,0.18)",
          hoverBorderColor: "rgba(183,139,67,0.45)",
          hoverTextColor: "#F2DFB5",
        },

        crossReference: {
          background: "rgba(79,111,142,0.12)",
          borderColor: "rgba(79,111,142,0.32)",
          textColor: "#EAD8B8",
          hoverBackground: "rgba(79,111,142,0.20)",
          hoverBorderColor: "rgba(79,111,142,0.48)",
          hoverTextColor: "#F2DFB5",
        },

        thematic: {
          background: "rgba(255,255,255,0.04)",
          borderColor: "rgba(183,139,67,0.12)",
          textColor: "#C6AB7A",
          hoverBackground: "rgba(183,139,67,0.12)",
          hoverBorderColor: "rgba(183,139,67,0.28)",
          hoverTextColor: "#EAD8B8",
        },

        active: {
          background: "rgba(42,35,29,0.92)",
          borderColor: "rgba(183,139,67,0.45)",
          textColor: "#F2DFB5",
        },
      },
    },

    navItem: {
      minHeight: "44px",
      paddingX: "16px",
      paddingY: "12px",
      borderRadius: "6px",
      textRole: "navItem",
      colorDefault: "#EAD8B8",
      colorHover: "#F2DFB5",
      colorActive: "#F2DFB5",
      bgDefault: "transparent",
      bgHover: "rgba(183,139,67,0.12)",
      bgActive: "rgba(183,139,67,0.18)",
      borderDefault: "transparent",
      borderActive: "rgba(183,139,67,0.45)",
    },

    link: {
      colorDefault: "#F2DFB5",
      colorHover: "#D7B879",
      underlineOffset: "2px",
      decorationThickness: "1px",
    },

    divider: {
      color: "rgba(183,139,67,0.18)",
      thickness: "1px",
      insetSpacing: "16px",
    },

    texture: {
      enabled: true,
      opacity: 0.32,
      blendMode: "screen" as const,
      layers: [
        "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.06), transparent 30%)",
        "radial-gradient(circle at 80% 20%, rgba(215,184,121,0.05), transparent 25%)",
        "radial-gradient(circle at 60% 60%, rgba(255,255,255,0.03), transparent 35%)",
      ],
    },
  },

  responsiveBehavior: {
    desktop: {
      minWidth: 1280,
      layout: "3-column",
      sidebarVisible: true,
      infoRailSticky: true,
      articleOutlineVisible: true,
    },

    laptop: {
      minWidth: 1024,
      maxWidth: 1279,
      layout: "3-column",
      sidebarVisible: true,
      infoRailSticky: true,
      articleOutlineVisible: true,
    },

    tablet: {
      minWidth: 768,
      maxWidth: 1023,
      layout: "single-main-column",
      sidebarVisible: false,
      sidebarMode: "drawer" as const,
      infoRailPlacement: "belowHeader" as const,
      articleOutlineVisible: false,
      sectionTabsScrollable: true,
    },

    mobile: {
      maxWidth: 767,
      layout: "single-column",
      sidebarVisible: false,
      sidebarMode: "drawer" as const,
      infoRailPlacement: "belowHeader" as const,
      articleOutlineVisible: false,
      sectionTabsScrollable: true,
      topUtilityBarStacked: true,
    },
  },

  implementationRules: [
    "No raw hex values inside components when a token exists.",
    "No one-off spacing values outside the spacing scale.",
    "Use semantic heading roles.",
    "Use display font only for titles and headings.",
    "Use body font for body, labels, chips, nav, and metadata.",
    "Prefer semantic color tokens over primitive colors in components.",
    "Keep decorative texture subtle and behind content.",
    "Cards share base tokens, then extend by variant.",
    "RelatedEntitiesCard is same-category only.",
    "CrossReferenceChips is cross-category only.",
  ],
} as const;

export type Tokens = typeof tokens;
export type TypographyRole = keyof typeof tokens.typography.roles;
export type ChipVariant = keyof typeof tokens.components.chip.variants;
