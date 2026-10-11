import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { STATUS_LABEL, TYPE_LABEL, type RawStatus, type RawType } from '~/constants';

export interface EpisodeServer { name: string; url: string; }
export interface EpisodeStream { quality: string; servers: EpisodeServer[]; }
export interface EpisodeDownload { quality: string; size: string; servers: EpisodeServer[]; }
export interface EpisodeData {
  number: number;
  title?: string;
  streams: EpisodeStream[];
  downloads?: EpisodeDownload[];
}
export interface Franchise {
  relation: string;
  slug: string;
  title?: string;
}

export type AnimeEntry = CollectionEntry<'anime'>;

export type QimochiStatus = 'Ongoing' | 'Completed' | 'Hiatus' | 'Upcoming';
export type QimochiType = 'TV' | 'Movie' | 'OVA' | 'ONA' | 'Special';

export type HydratedAnime = Omit<AnimeEntry, 'data'> & {
  data: Omit<AnimeEntry['data'], 'status' | 'type'> & {
    // display (di-derive dari raw schema)
    status: QimochiStatus;
    type: QimochiType;

    // view convenience
    cover: string;
    studio: string;
    genre: string[];
    releaseDate: Date | null;

    // alias eksplisit untuk skor (dari stats.score)
    score: number | null;

    episodes: EpisodeData[];
    franchises: Franchise[];

    // CATATAN: `rating` tetap dari schema (enum umur G/PG-13/...).
    // JANGAN di-overwrite.
  };
};

interface ChunkRef { slug: string; start: number; end: number; path: string; }

const HIDDEN_RELATIONS = new Set([
  'character', 'adaptation', 'contains', 'other',
]);

const episodeModules = import.meta.glob<{ default: EpisodeData[] }>(
  '../data/anime/*/episodes/streams/*.json',
  { eager: true }
);

const franchiseModules = import.meta.glob<{ default: Franchise[] }>(
  '../data/anime/*/franchises.json',
  { eager: true }
);

const chunksBySlug: Record<string, ChunkRef[]> = {};
for (const [path, mod] of Object.entries(episodeModules)) {
  const match = path.match(/\/data\/anime\/([^/]+)\/episodes\/streams\/(\d+)-(\d+)\.json$/);
  if (!match) continue;
  const slug = match[1];
  const start = parseInt(match[2] ?? '0', 10);
  const end = parseInt(match[3] ?? '0', 10);
  if (!slug || isNaN(start) || isNaN(end)) continue;
  if (!Array.isArray(mod.default)) continue;
  (chunksBySlug[slug] ??= []).push({ slug, start, end, path });
}

const episodesBySlug: Record<string, EpisodeData[]> = {};
for (const [slug, chunks] of Object.entries(chunksBySlug)) {
  chunks.sort((a, b) => a.start - b.start);
  const merged: EpisodeData[] = [];
  for (const chunk of chunks) {
    const mod = episodeModules[chunk.path];
    if (!mod || !Array.isArray(mod.default)) continue;
    merged.push(...mod.default);
  }
  merged.sort((a, b) => a.number - b.number);
  episodesBySlug[slug] = merged;
}

const franchisesBySlug: Record<string, Franchise[]> = {};
for (const [path, mod] of Object.entries(franchiseModules)) {
  const match = path.match(/\/data\/anime\/([^/]+)\/franchises\.json$/);
  if (!match) continue;
  const slug = match[1];
  if (!slug) continue;
  const raw = Array.isArray(mod.default) ? mod.default : [];
  franchisesBySlug[slug] = raw.filter(
    (f) => f && typeof f.slug === 'string' && !HIDDEN_RELATIONS.has(f.relation)
  );
}

function toDisplayStatus(s: RawStatus): QimochiStatus {
  return STATUS_LABEL[s] as QimochiStatus;
}

function toDisplayType(t: RawType): QimochiType {
  return TYPE_LABEL[t] as QimochiType;
}

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function resolveReleaseDate(
  aired: { from?: Date } | undefined,
  year: number | undefined
): Date | null {
  if (aired?.from instanceof Date) return aired.from;
  if (year) return new Date(Date.UTC(year, 0, 1));
  return null;
}

function resolveStudio(studios: string[] | undefined): string {
  const first = studios?.[0];
  if (!first) return 'Unknown';
  return titleCase(first);
}

function resolveGenre(genres: string[] | undefined): string[] {
  if (!genres || genres.length === 0) return ['Unknown'];
  return genres.map(titleCase);
}

function resolveScore(stats: { score?: number } | undefined): number | null {
  const s = stats?.score;
  if (typeof s === 'number' && s >= 0) return s;
  return null;
}

async function hydrateOne(anime: AnimeEntry): Promise<HydratedAnime> {
  const slug = anime.id;
  const d = anime.data;

  const releaseDate = resolveReleaseDate(d.aired, d.year);

  return {
    ...anime,
    data: {
      ...d,   // <- bawa `rating` (enum) apa adanya, JANGAN ditimpa
      status: toDisplayStatus(d.status as RawStatus),
      type: toDisplayType(d.type as RawType),
      cover: d.image ?? '',
      studio: resolveStudio(d.studios),
      genre: resolveGenre(d.genres),
      releaseDate,
      score: resolveScore(d.stats),
      episodes: episodesBySlug[slug] ?? [],
      franchises: franchisesBySlug[slug] ?? [],
    },
  };
}

export async function getAllAnime(): Promise<HydratedAnime[]> {
  const all = await getCollection('anime', ({ data }) => !data.draft);
  return Promise.all(all.map(hydrateOne));
}

export async function getAnimeById(id: string): Promise<HydratedAnime | null> {
  const anime = await getEntry('anime', id);
  if (!anime || anime.data.draft) return null;
  return hydrateOne(anime);
}

export function sortByRecent(items: HydratedAnime[]): HydratedAnime[] {
  return [...items].sort((a, b) => {
    const at = (a.data.updatedAt ?? a.data.addedAt)?.getTime() ?? 0;
    const bt = (b.data.updatedAt ?? b.data.addedAt)?.getTime() ?? 0;
    return bt - at;
  });
}

export function getYear(anime: HydratedAnime): number | null {
  return anime.data.releaseDate?.getFullYear() ?? null;
}

export interface EpisodePathItem {
  slug: string;
  anime: HydratedAnime;
  episode: EpisodeData;
  episodeIndex: number;
  totalEpisodes: number;
}

export async function getAllEpisodePaths(): Promise<EpisodePathItem[]> {
  const all = await getAllAnime();
  const paths: EpisodePathItem[] = [];
  for (const anime of all) {
    const eps = anime.data.episodes;
    const total = eps.length;
    eps.forEach((episode, episodeIndex) => {
      paths.push({ slug: anime.id, anime, episode, episodeIndex, totalEpisodes: total });
    });
  }
  return paths;
}

export function findEpisode(anime: HydratedAnime, episodeNumber: number): EpisodeData | null {
  return anime.data.episodes.find((e) => e.number === episodeNumber) ?? null;
}