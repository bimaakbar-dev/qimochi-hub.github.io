// src/lib/genre.ts
import { getCollection } from 'astro:content';
import { PER_PAGE } from '../constants';
import { getAllAnime, sortByRecent, type HydratedAnime } from './anime';

export type { HydratedAnime };

export interface GenreEntry {
  id: string;
  name: string;
  category: 'genre' | 'theme' | 'demographic';
}

export async function getAllGenreEntries(): Promise<GenreEntry[]> {
  const genres = await getCollection('genres');
  return genres.map(g => ({
    id: g.data.id,
    name: g.data.name,
    category: g.data.category,
  }));
}

export async function getAnimeByGenreSlug(
  slug: string
): Promise<HydratedAnime[]> {
  const allAnime = await getAllAnime();
  const filtered = allAnime.filter(a => a.data.genres.includes(slug));
  return sortByRecent(filtered);
}

export function paginate<T>(items: T[], page: number): T[] {
  const start = (page - 1) * PER_PAGE;
  return items.slice(start, start + PER_PAGE);
}