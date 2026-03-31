import type { MetadataRoute } from "next";
import { FYLKER } from "@/lib/supabase/types";
import data from "@/data/takstmenn.json";

const BASE_URL = "https://www.velgtakst.no";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Statiske sider
  const statiskeSider: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/blogg`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/registrer/takstmann`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/registrer/megler`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/registrer/kunde`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/logg-inn`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/vilkar`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Fylkesider
  const fylkeSider: MetadataRoute.Sitemap = FYLKER.map((fylke) => ({
    url: `${BASE_URL}/${fylke.id}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Blogginnlegg
  const bloggSider: MetadataRoute.Sitemap = data.bloggposter.map((post) => ({
    url: `${BASE_URL}/blogg/${post.id}`,
    lastModified: new Date(post.dato),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...statiskeSider, ...fylkeSider, ...bloggSider];
}
