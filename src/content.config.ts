import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const AnimeRating = z.enum(['G', 'PG', 'PG-13', 'R', 'R+', 'Rx']);

const anime = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/anime' }),
  schema: z.object({
    title: z.string(),
    titleEnglish: z.string().optional(),
    titleNative: z.string().optional(),

    malId: z.number().int().positive().optional(),
    kitsuId: z.string().optional(),

    type: z.enum(['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music', 'Unknown']),
    status: z.enum(['airing', 'finished', 'upcoming', 'hiatus', 'cancelled']),

    source: z.string().optional(),
    season: z.string().optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    episodes: z.number().int().nullable().optional(),
    duration: z.number().int().positive().optional(),
    rating: z.string().optional(),

    aired: z
      .object({
        from: z.coerce.date().optional(),
        to: z.coerce.date().nullable().optional(),
      })
      .optional(),

    stats: z
      .object({
        score: z.number().min(0).max(10).optional(),
        scoredBy: z.number().int().nonnegative().optional(),
      })
      .optional(),

    genres: z.array(z.string()).default([]),
    studios: z.array(z.string()).default([]),

    image: z.url().optional(),
    banner: z.url().optional(),
    trailer: z.string().optional(),

    draft: z.boolean().default(false),

    addedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().max(120),
    description: z.string().max(200),
    cover: z.url().optional(),
    date: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    author: z.string().default('Admin'),
    category: z.enum(['News', 'Review', 'List', 'Guide', 'Update']),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { anime, blog };