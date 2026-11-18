export type LibraryBook = {
  id: string
  title: string
  authors: string[]
  coverUrl: string | null
  year: number | null
  subjects: string[]
  openLibraryUrl: string
}

export type LibraryCategory = {
  id: string
  label: string
  subject: string
}

/** Curated subjects that fit an education / health campus catalogue. */
export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  { id: 'nursing', label: 'Nursing', subject: 'nursing' },
  { id: 'medicine', label: 'Medicine', subject: 'medicine' },
  { id: 'education', label: 'Education', subject: 'education' },
  { id: 'psychology', label: 'Psychology', subject: 'psychology' },
  { id: 'biology', label: 'Biology', subject: 'biology' },
  { id: 'business', label: 'Business', subject: 'business' },
  { id: 'history', label: 'History', subject: 'history' },
  { id: 'literature', label: 'Literature', subject: 'literature' },
]

export const DEFAULT_LIBRARY_CATEGORY = LIBRARY_CATEGORIES[0]!

type OpenLibraryDoc = {
  key?: string
  title?: string
  author_name?: string[]
  cover_i?: number
  first_publish_year?: number
  subject?: string[]
}

type OpenLibraryWork = {
  key?: string
  title?: string
  authors?: { name?: string }[]
  cover_id?: number
  first_publish_year?: number
  subject?: string[]
}

function coverFromId(coverId: number | undefined | null): string | null {
  if (!coverId) return null
  return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
}

function normalizeDoc(doc: OpenLibraryDoc): LibraryBook | null {
  const key = doc.key?.trim()
  const title = doc.title?.trim()
  if (!key || !title) return null
  return {
    id: key,
    title,
    authors: doc.author_name?.filter(Boolean) ?? [],
    coverUrl: coverFromId(doc.cover_i),
    year: doc.first_publish_year ?? null,
    subjects: doc.subject?.slice(0, 4) ?? [],
    openLibraryUrl: `https://openlibrary.org${key}`,
  }
}

function normalizeWork(work: OpenLibraryWork): LibraryBook | null {
  const key = work.key?.trim()
  const title = work.title?.trim()
  if (!key || !title) return null
  return {
    id: key.startsWith('/works/') ? key : `/works/${key.replace(/^\//, '')}`,
    title,
    authors: (work.authors ?? []).map((a) => a.name).filter((n): n is string => Boolean(n)),
    coverUrl: coverFromId(work.cover_id),
    year: work.first_publish_year ?? null,
    subjects: work.subject?.slice(0, 4) ?? [],
    openLibraryUrl: `https://openlibrary.org${key.startsWith('/') ? key : `/${key}`}`,
  }
}

export async function fetchOpenLibraryBooks(options: {
  subject?: string
  query?: string
  page?: number
  limit?: number
  signal?: AbortSignal
}): Promise<{ books: LibraryBook[]; total: number }> {
  const page = Math.max(1, options.page ?? 1)
  const limit = Math.min(100, Math.max(1, options.limit ?? 100))
  const query = options.query?.trim()
  const subject = options.subject?.trim() || DEFAULT_LIBRARY_CATEGORY.subject

  if (query) {
    const url = new URL('https://openlibrary.org/search.json')
    url.searchParams.set('q', query)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('fields', 'key,title,author_name,cover_i,first_publish_year,subject')

    const res = await fetch(url.toString(), {
      signal: options.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error(`Open Library search failed (${res.status})`)
    const data = (await res.json()) as { numFound?: number; docs?: OpenLibraryDoc[] }
    const books = (data.docs ?? []).map(normalizeDoc).filter((b): b is LibraryBook => Boolean(b))
    return { books, total: data.numFound ?? books.length }
  }

  const offset = (page - 1) * limit
  const url = new URL(`https://openlibrary.org/subjects/${encodeURIComponent(subject)}.json`)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('offset', String(offset))

  const res = await fetch(url.toString(), {
    signal: options.signal,
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 },
  })
  if (!res.ok) throw new Error(`Open Library subject failed (${res.status})`)
  const data = (await res.json()) as { work_count?: number; works?: OpenLibraryWork[] }
  const books = (data.works ?? []).map(normalizeWork).filter((b): b is LibraryBook => Boolean(b))
  return { books, total: data.work_count ?? books.length }
}

/** Deterministic spine colour when a cover is missing. */
export function bookSpineTone(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const hues = [12, 28, 152, 178, 210, 265, 320]
  const hue = hues[hash % hues.length]!
  const sat = 38 + (hash % 18)
  const lit = 28 + (hash % 14)
  return `hsl(${hue} ${sat}% ${lit}%)`
}
