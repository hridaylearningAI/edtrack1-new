import { NextResponse } from 'next/server'
import {
  DEFAULT_LIBRARY_CATEGORY,
  LIBRARY_CATEGORIES,
  fetchOpenLibraryBooks,
} from '@/lib/elibrary/open-library'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim() || undefined
  const categoryId = searchParams.get('category')?.trim() || DEFAULT_LIBRARY_CATEGORY.id
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '100') || 100))

  const category =
    LIBRARY_CATEGORIES.find((item) => item.id === categoryId) ?? DEFAULT_LIBRARY_CATEGORY

  try {
    const { books, total } = await fetchOpenLibraryBooks({
      query,
      subject: category.subject,
      page,
      limit,
    })

    return NextResponse.json(
      {
        books,
        total,
        page,
        category: category.id,
        query: query ?? null,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load catalogue'
    return NextResponse.json({ error: message, books: [], total: 0 }, { status: 502 })
  }
}
