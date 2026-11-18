'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Link from 'next/link'
import { UserButton, useUser } from '@clerk/nextjs'
import { ArrowLeft, Move, Search } from 'lucide-react'
import { DemoAvatar } from '@/components/demo-avatar'
import { DemoClerkAvatarSync } from '@/components/demo-clerk-avatar-sync'
import { DEMO_ACCOUNT_NAME, DEMO_ACCOUNT_SEED } from '@/lib/demo-avatars'
import {
  DEFAULT_LIBRARY_CATEGORY,
  LIBRARY_CATEGORIES,
  bookSpineTone,
  type LibraryBook,
} from '@/lib/elibrary/open-library'
import { DemoSurface } from './demo-surface'
import s from './elibrary-hall.module.css'

const BOOKS_PER_SHELF = 8
const SHELF_W = 760
const SHELF_H = 170
const BUFFER = 1
/** Fetch at most this many titles per Open Library request. */
const PAGE_SIZE = 100

type ShelfCell = {
  key: string
  cx: number
  cy: number
  books: LibraryBook[]
}

function cellKey(cx: number, cy: number) {
  return `${cx}:${cy}`
}

/** Stable offset into the loaded pool for a shelf cell. */
function shelfPoolOffset(cx: number, cy: number, poolLength: number) {
  if (poolLength <= 0) return 0
  const ax = cx >= 0 ? cx * 2 : -cx * 2 - 1
  const ay = cy >= 0 ? cy * 2 : -cy * 2 - 1
  return ((ax * 73856093) ^ (ay * 19349663)) >>> 0
}

async function loadBooksPage(options: {
  category: string
  query: string
  page: number
  signal?: AbortSignal
}): Promise<{ books: LibraryBook[]; total: number }> {
  const params = new URLSearchParams({
    category: options.category,
    page: String(options.page),
    limit: String(PAGE_SIZE),
  })
  if (options.query) params.set('q', options.query)

  const res = await fetch(`/api/elibrary/books?${params}`, { signal: options.signal })
  const data = (await res.json()) as {
    books?: LibraryBook[]
    total?: number
    error?: string
  }
  if (!res.ok) throw new Error(data.error || 'Could not load books')
  return { books: data.books ?? [], total: data.total ?? 0 }
}

export function ElibraryHall() {
  const { user } = useUser()
  const rootRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const camRef = useRef({ x: 0, y: 0 })
  const panRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const didPanRef = useRef(false)
  const poolRef = useRef<LibraryBook[]>([])
  const pagesLoadedRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const totalRef = useRef(0)
  const fetchGenRef = useRef(0)

  const [categoryId, setCategoryId] = useState(DEFAULT_LIBRARY_CATEGORY.id)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [pool, setPool] = useState<LibraryBook[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)
  const [settled, setSettled] = useState(false)
  const [viewport, setViewport] = useState({ w: 1200, h: 800 })
  const [camTick, setCamTick] = useState(0)
  const [selected, setSelected] = useState<LibraryBook | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 320)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const measure = () => {
      const rect = el.getBoundingClientRect()
      setViewport({ w: rect.width, h: rect.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(true), 4200)
    return () => window.clearTimeout(timer)
  }, [])

  const applyCamera = useCallback(() => {
    const world = worldRef.current
    if (!world) return
    world.style.transform = `translate3d(${camRef.current.x}px, ${camRef.current.y}px, 0)`
    setCamTick((n) => n + 1)
  }, [])

  const ensurePoolCapacity = useCallback(
    async (needed: number, signal?: AbortSignal) => {
      if (loadingMoreRef.current) return
      if (poolRef.current.length >= needed) return
      if (totalRef.current > 0 && poolRef.current.length >= totalRef.current) return

      loadingMoreRef.current = true
      setLoadingMore(true)
      try {
        while (
          poolRef.current.length < needed &&
          (totalRef.current === 0 || poolRef.current.length < totalRef.current)
        ) {
          const nextPage = pagesLoadedRef.current + 1
          const before = poolRef.current.length
          const { books, total } = await loadBooksPage({
            category: categoryId,
            query: debouncedQuery,
            page: nextPage,
            signal,
          })
          totalRef.current = total
          pagesLoadedRef.current = nextPage
          if (!books.length) break

          const seen = new Set(poolRef.current.map((b) => b.id))
          const merged = [...poolRef.current]
          for (const book of books) {
            if (seen.has(book.id)) continue
            seen.add(book.id)
            merged.push(book)
          }
          poolRef.current = merged
          setPool(merged)
          if (merged.length === before) break
        }
      } finally {
        loadingMoreRef.current = false
        setLoadingMore(false)
      }
    },
    [categoryId, debouncedQuery]
  )

  useEffect(() => {
    const gen = ++fetchGenRef.current
    const controller = new AbortController()
    poolRef.current = []
    pagesLoadedRef.current = 0
    totalRef.current = 0
    setPool([])
    setSelected(null)
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const { books, total } = await loadBooksPage({
          category: categoryId,
          query: debouncedQuery,
          page: 1,
          signal: controller.signal,
        })
        if (gen !== fetchGenRef.current) return
        poolRef.current = books
        pagesLoadedRef.current = 1
        totalRef.current = total
        setPool(books)
        if (!books.length) setError('No titles in this shelf yet. Try another category or search.')
      } catch (err) {
        if (controller.signal.aborted || gen !== fetchGenRef.current) return
        setError(err instanceof Error ? err.message : 'Could not load the catalogue')
      } finally {
        if (gen === fetchGenRef.current) setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [categoryId, debouncedQuery])

  const visibleShelves = useMemo(() => {
    void camTick
    const cam = camRef.current
    const minCx = Math.floor((-cam.x - BUFFER * SHELF_W) / SHELF_W)
    const maxCx = Math.ceil((-cam.x + viewport.w + BUFFER * SHELF_W) / SHELF_W)
    const minCy = Math.floor((-cam.y - BUFFER * SHELF_H) / SHELF_H)
    const maxCy = Math.ceil((-cam.y + viewport.h + BUFFER * SHELF_H) / SHELF_H)

    const cells: ShelfCell[] = []
    const poolLen = pool.length
    let exploreRing = 0

    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        exploreRing = Math.max(exploreRing, Math.max(Math.abs(cx), Math.abs(cy)))
        const books: LibraryBook[] = []
        if (poolLen) {
          const start = shelfPoolOffset(cx, cy, poolLen) % poolLen
          for (let i = 0; i < BOOKS_PER_SHELF; i++) {
            const book = pool[(start + i) % poolLen]
            if (book) books.push(book)
          }
        }
        cells.push({ key: cellKey(cx, cy), cx, cy, books })
      }
    }

    // One page (100) at the origin; each shelf-ring out requests the next page.
    const pagesWanted = exploreRing + 1
    return { cells, pagesWanted, neededCount: pagesWanted * PAGE_SIZE }
  }, [pool, viewport.w, viewport.h, camTick])

  useEffect(() => {
    if (loading) return
    if (!pool.length && pagesLoadedRef.current === 0) return
    const needed = visibleShelves.neededCount
    if (needed <= pool.length) return
    if (totalRef.current > 0 && pool.length >= totalRef.current) return
    void ensurePoolCapacity(needed)
  }, [visibleShelves.neededCount, pool.length, loading, ensurePoolCapacity])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const target = event.target as HTMLElement
    if (target.closest('[data-chrome]')) return

    didPanRef.current = false
    panRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: camRef.current.x,
      originY: camRef.current.y,
      moved: false,
    }
    setPanning(true)
    setSettled(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    const dx = event.clientX - pan.startX
    const dy = event.clientY - pan.startY
    if (!pan.moved && Math.hypot(dx, dy) > 4) {
      pan.moved = true
      didPanRef.current = true
    }
    camRef.current = {
      x: pan.originX + dx,
      y: pan.originY + dy,
    }
    applyCamera()
  }

  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panRef.current
    if (!pan || pan.pointerId !== event.pointerId) return
    didPanRef.current = pan.moved
    panRef.current = null
    setPanning(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      /* already released */
    }
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      camRef.current = {
        x: camRef.current.x - event.deltaX,
        y: camRef.current.y - event.deltaY,
      }
      setSettled(true)
      applyCamera()
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyCamera])

  const openBook = (book: LibraryBook, event: ReactMouseEvent) => {
    if (didPanRef.current) {
      event.preventDefault()
      didPanRef.current = false
      return
    }
    setSelected(book)
  }

  const activeCategory =
    LIBRARY_CATEGORIES.find((c) => c.id === categoryId) ?? DEFAULT_LIBRARY_CATEGORY

  return (
    <DemoSurface>
      <DemoClerkAvatarSync />
      <div
        ref={rootRef}
        className={s.hall}
        data-panning={panning || undefined}
        data-settled={settled || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
      >
        <div className={s.ambient} aria-hidden />

        <div className={s.chrome} data-chrome>
          <Link href="/platform" className={s.backLink}>
            <ArrowLeft size={14} aria-hidden />
            Platform map
          </Link>

          <div className={s.accountMenu}>
            <div className={s.accountPanel}>
              <div className={s.accountHead}>
                <div className={s.accountMeta}>
                  <b>{user?.fullName || DEMO_ACCOUNT_NAME}</b>
                  <small>eLibrary · {activeCategory.label}</small>
                </div>
                <div className={s.accountAvatar}>
                  <DemoAvatar seed={DEMO_ACCOUNT_SEED} name={DEMO_ACCOUNT_NAME} size={36} />
                  <div style={{ position: 'absolute', inset: 0, opacity: 0 }}>
                    <UserButton afterSignOutUrl="/demo" />
                  </div>
                </div>
              </div>

              <label className={s.accountSearch}>
                <Search size={14} aria-hidden />
                <input
                  type="search"
                  placeholder="Search the shelves…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search eLibrary catalogue"
                />
              </label>

              <div className={s.categories} role="group" aria-label="Book categories">
                {LIBRARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={s.categoryChip}
                    aria-pressed={categoryId === cat.id}
                    onClick={() => {
                      setCategoryId(cat.id)
                      setQuery('')
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={s.stage} aria-label="Infinite library shelves">
          <div ref={worldRef} className={s.world}>
            {visibleShelves.cells.map((cell) => (
              <div
                key={cell.key}
                className={s.shelfRow}
                style={{
                  width: SHELF_W,
                  height: SHELF_H,
                  left: cell.cx * SHELF_W,
                  top: cell.cy * SHELF_H,
                }}
              >
                <span className={s.shelfLabel}>{activeCategory.label}</span>
                {cell.books.map((book, index) => (
                  <button
                    key={`${cell.key}-${book.id}-${index}`}
                    type="button"
                    className={s.book}
                    style={{ background: bookSpineTone(book.id) }}
                    onClick={(event) => openBook(book, event)}
                    aria-label={`${book.title}${book.authors[0] ? ` by ${book.authors[0]}` : ''}`}
                  >
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={s.bookCover}
                        src={book.coverUrl}
                        alt=""
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className={s.bookFallback}>
                        <strong>{book.title}</strong>
                        <span>{book.authors[0] || 'Open Library'}</span>
                      </div>
                    )}
                    <span className={s.bookShine} aria-hidden />
                  </button>
                ))}
                <div className={s.shelfBoard} aria-hidden />
              </div>
            ))}
          </div>
        </div>

        <div className={s.hint}>
          <Move size={13} aria-hidden />
          Drag or scroll to wander the shelves
        </div>

        {(loading || loadingMore || error) && (
          <div className={s.status} data-error={Boolean(error) || undefined} role="status">
            {error
              ? error
              : loading
                ? 'Shelving titles from Open Library…'
                : `Fetching next ${PAGE_SIZE} titles…`}
          </div>
        )}

        {selected && (
          <div className={s.detail} data-chrome role="dialog" aria-label={selected.title}>
            <h2>{selected.title}</h2>
            <p>
              {selected.authors.length ? selected.authors.slice(0, 3).join(', ') : 'Unknown author'}
              {selected.year ? ` · ${selected.year}` : ''}
              {selected.subjects[0] ? ` · ${selected.subjects[0]}` : ''}
            </p>
            <div className={s.detailActions}>
              <a href={selected.openLibraryUrl} target="_blank" rel="noreferrer">
                Open on Open Library
              </a>
              <button type="button" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </DemoSurface>
  )
}
