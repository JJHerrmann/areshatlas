import type { MetadataRoute } from "next";

const BASE_URL = "https://www.areshatlas.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/prototype",
          "/prototype_burgs",
          "/prototype_map",
          "/prototype_traversal",
          "/prototype_traversal_drakharpan",
          "/content-assets/",
          "/region-assets/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
