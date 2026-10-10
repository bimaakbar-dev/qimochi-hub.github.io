// src/content.config.ts
//
// Baseline: bimaakbar-dev/yukionime @ content.config.ts
// Extend qimochi: addedAt, updatedAt (untuk sorting "Latest Update").
//
// Aturan: kalau mau ubah schema anime, update yukionime dulu,
// lalu sync ke sini. Jangan divergen di luar blok "Extend qimochi".

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob, file } from 'astro/loaders';

// ────────────────────────────────────────────────────────
// BASELINE — verbatim yukionime
// ────────────────────────────────────────────────────────

const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Harus lowercase-kebab-case');

const ExternalUrl = z.url();

const AnimeType = z.enum([
  'TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music', 'Unknown',
]);

const AnimeStatus = z.enum([
  'airing', 'finished', 'upcoming', 'hiatus', 'cancelled',
]);

const AnimeSource = z.enum([
  'original', 'manga', 'light_novel', 'visual_novel', 'game',
  'web_manga', 'web_novel', 'novel', 'book', 'picture_book',
  'radio', 'music', '4_koma_manga', 'card_game', 'other',
]);

const AnimeSeason = z.enum(['winter', 'spring', 'summer', 'fall']);
const AnimeRating = z.enum(['G', 'PG', 'PG-13', 'R', 'R+', 'Rx']);

const anime = defineCollection({
  loader: glob({
    pattern: ['**/*.md', '!**/_*.md'],
    base: './src/content/anime',
    deferRender: true,
  }),
  schema: z.object({
    title: z.string().min(1),
    titleEnglish: z.string().optional(),
    titleNative: z.string().optional(),

    malId: z.number().int().positive().optional(),
    anilistId: z.number().int().positive().optional(),
    kitsuId: z.string().optional(),

    type: AnimeType,
    status: AnimeStatus,
    source: AnimeSource.optional(),
    season: AnimeSeason.optional(),
    year: z.number().int().min(1900).max(2100).optional(),
    episodes: z.number().int().positive().nullable().optional(),
    duration: z.number().int().positive().optional(),
    rating: AnimeRating.optional(),

    aired: z.object({
      from: z.coerce.date().optional(),
      to: z.coerce.date().nullable().optional(),
    }).optional(),

    stats: z.object({
      score: z.number().min(0).max(10).optional(),
      scoredBy: z.number().int().nonnegative().optional(),
    }).optional(),

    genres: z.array(Slug).default([]),
    studios: z.array(Slug).default([]),

    image: ExternalUrl.optional(),
    banner: ExternalUrl.optional(),
    trailer: z.string().optional(),

    draft: z.boolean().default(false),

    // ─────────────────────────────────────────────────
    // EXTEND QIMOCHI — jangan diadopsi ke yukionime
    // ─────────────────────────────────────────────────
    addedAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
});

// ────────────────────────────────────────────────────────
// GENRES & STUDIOS — referensi dari yukio-data
// (di-copy oleh .github/workflows/deploy.yml)
// ────────────────────────────────────────────────────────

const genres = defineCollection({
  loader: file('./src/data/genres.json'),
  schema: z.object({
    id: Slug,
    name: z.string(),
    description: z.string().optional(),
    category: z.enum(['genre', 'theme', 'demographic']).default('genre'),
  }),
});

const studios = defineCollection({
  loader: file('./src/data/studios.json'),
  schema: z.object({
    id: Slug,
    name: z.string(),
    nameNative: z.string().optional(),
    founded: z.number().int().min(1900).max(2100).optional(),
    website: ExternalUrl.optional(),
    description: z.string().optional(),
  }),
});

// ────────────────────────────────────────────────────────
// BLOG — khusus qimochi, tidak ada di yukionime
// ────────────────────────────────────────────────────────

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

export const collections = { anime, genres, studios, blog };