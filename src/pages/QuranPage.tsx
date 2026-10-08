import { Bookmark, ChevronLeft, LayoutList } from 'lucide-react'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { ErrorState, PageLoader } from '../components/ui'
import {
  getLastPage,
  LINES_PER_PAGE,
  printedPage,
  readingMark,
  saveLastPage,
  useMushaf,
  type Mushaf,
  type MushafLine,
} from '../lib/quran'
import { cn } from '../lib/utils'

/** Pages rendered on each side of the current one (the rest are empty placeholders) */
const RENDER_WINDOW = 2

/** Page to open: ?page=<layout page>, else the "stopped here" mark, else the last page read */
function initialPage() {
  const fromUrl = Number(new URLSearchParams(location.search).get('page'))
  if (Number.isInteger(fromUrl) && fromUrl >= 1) return fromUrl
  return readingMark.read()?.page ?? getLastPage()
}

/**
 * 13-line IndoPak Mushaf reader (/quran/read). Pages sit in a right-to-left horizontal
 * scroller with snap points, so swiping turns pages like a printed Mushaf.
 * Tapping a line marks "stopped here"; tapping it again clears the mark.
 * Daily surahs (?daily=1) are read separately: they never move Continue reading or the mark.
 */
export function QuranReaderPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const daily = params.get('daily') === '1'
  const { data: mushaf, isLoading, error, refetch } = useMushaf()
  const scroller = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(initialPage) // layout page, 1-based
  const mark = readingMark.use()

  const total = mushaf?.pages.length ?? 0

  const scrollToPage = useCallback((p: number) => {
    const el = scroller.current?.children[p - 1] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'instant', inline: 'center', block: 'nearest' })
  }, [])

  // Open at the initial page once the data is ready
  const opened = useRef(false)
  useLayoutEffect(() => {
    if (!mushaf || opened.current) return
    opened.current = true
    scrollToPage(Math.min(page, mushaf.pages.length))
  }, [mushaf, page, scrollToPage])

  // Track the page in view (RTL scrollLeft is negative in modern browsers, hence abs)
  const onScroll = () => {
    const el = scroller.current
    if (!el || !el.clientWidth) return
    const p = Math.round(Math.abs(el.scrollLeft) / el.clientWidth) + 1
    if (p !== page && p >= 1 && p <= total) setPage(p)
  }

  // Remember the page; keep the URL in sync so a reload opens the same page
  useEffect(() => {
    if (!total) return
    if (!daily) saveLastPage(page)
    setParams(daily ? { page: String(page), daily: '1' } : { page: String(page) }, { replace: true })
  }, [page, total, daily, setParams])

  const toggleMark = useCallback((p: number, line: number) => {
    const cur = readingMark.read()
    readingMark.write(cur?.page === p && cur.line === line ? null : { page: p, line })
  }, [])

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (isLoading || !mushaf) return <PageLoader />

  const current = mushaf.pages[Math.min(page, total) - 1]
  const surah = current?.surah ? mushaf.surahs[current.surah - 1] : undefined

  return (
    <div className="flex h-dvh flex-col bg-stone-100">
      {/* Top bar */}
      <header className="pt-safe flex h-12 shrink-0 items-center gap-1 bg-emerald-900 px-1 text-white">
        <button
          aria-label="Back to Quran menu"
          onClick={() => navigate('/quran')}
          className="grid h-10 w-10 place-items-center rounded-full active:bg-white/10"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button onClick={() => navigate('/quran')} className="min-w-0 flex-1 text-left">
          <div className="truncate text-sm leading-tight font-semibold">{surah ? surah.en : 'Quran'}</div>
          <div className="text-[11px] text-emerald-200">
            Para {current?.juz} · Page {printedPage(page)}
          </div>
        </button>
        <button
          aria-label="Quran menu"
          onClick={() => navigate('/quran')}
          className="grid h-10 w-10 place-items-center rounded-full active:bg-white/10"
        >
          <LayoutList className="h-5 w-5" />
        </button>
      </header>

      {/* Pages: right-to-left, one per screen, snap to each page */}
      <div
        ref={scroller}
        dir="rtl"
        onScroll={onScroll}
        className="no-scrollbar flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
      >
        {mushaf.pages.map((_, i) => (
          <div key={i} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2">
            {Math.abs(i + 1 - page) <= RENDER_WINDOW && (
              <Page
                mushaf={mushaf}
                pageNo={i + 1}
                markedLine={!daily && mark?.page === i + 1 ? mark.line : null}
                onToggleMark={daily ? undefined : toggleMark}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* One Mushaf page                                                     */
/* ------------------------------------------------------------------ */

const Page = memo(function Page({
  mushaf,
  pageNo,
  markedLine,
  onToggleMark,
}: {
  mushaf: Mushaf
  pageNo: number
  markedLine: number | null
  /** Omitted in daily-surah mode (no marking) */
  onToggleMark?: (page: number, line: number) => void
}) {
  const page = mushaf.pages[pageNo - 1]
  const surah = page.surah ? mushaf.surahs[page.surah - 1] : undefined
  // Short pages (Al-Fatihah, start of Al-Baqarah) are centred vertically like the print
  const short = page.lines.length < LINES_PER_PAGE && pageNo <= 2

  return (
    <article
      dir="rtl"
      aria-label={`Page ${printedPage(pageNo)}`}
      className="@container flex aspect-[1/1.5] max-h-full w-full max-w-[min(100%,calc((100dvh-4rem)/1.5))] flex-col rounded-sm bg-[#fffdf4] p-[2.2cqw] text-stone-900 shadow-md"
    >
      {/* Running header: para (right) · surah (left) */}
      <div className="flex shrink-0 items-center justify-between px-[1cqw] pb-[0.8cqw] text-[3.4cqw] font-medium text-emerald-900">
        <span>پارہ {page.juz}</span>
        <span>{surah?.ar}</span>
      </div>

      {/* Framed text area */}
      <div className="flex min-h-0 flex-1 flex-col border-[0.6cqw] border-double border-emerald-800/70 p-[0.8cqw]">
        <div
          className={cn(
            'grid min-h-0 flex-1 border border-emerald-800/30',
            short ? 'content-center' : 'grid-rows-[repeat(13,minmax(0,1fr))]',
          )}
        >
          {page.lines.map((line, i) => (
            <Line
              key={i}
              line={line}
              mushaf={mushaf}
              short={short}
              marked={markedLine === i}
              onToggleMark={onToggleMark && line[0] === 'a' ? () => onToggleMark(pageNo, i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Page number */}
      <div className="shrink-0 pt-[0.8cqw] text-center text-[3cqw] font-medium text-stone-500" dir="ltr">
        {printedPage(pageNo)}
      </div>
    </article>
  )
})

/**
 * A single line. Ayah lines are justified edge to edge (word spacing stretches like the print);
 * if a line is slightly too long for the screen it is compressed horizontally instead of wrapping.
 */
function Line({
  line,
  mushaf,
  short,
  marked,
  onToggleMark,
}: {
  line: MushafLine
  mushaf: Mushaf
  short: boolean
  marked: boolean
  onToggleMark?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const inner = el.firstElementChild as HTMLElement | null
      if (!inner) return
      const natural = inner.scrollWidth
      const avail = el.clientWidth
      setScale(natural > avail && avail > 0 ? avail / natural : 1)
    }
    fit()
    void document.fonts?.ready.then(fit)
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [line])

  const rowCls = cn(
    'relative flex min-w-0 items-center border-b border-emerald-800/15 px-[1.2cqw] last:border-b-0',
    short && 'py-[1.4cqw]',
  )

  if (line[0] === 's') {
    const s = mushaf.surahs[line[1] - 1]
    return (
      <div className={rowCls}>
        <div className="mx-auto flex w-[78%] items-center justify-center rounded-full border border-emerald-800/50 bg-emerald-50 py-[0.4cqw] font-quran text-[4.8cqw] leading-[1.5] text-emerald-900">
          سُوْرَۃُ {s.ar}
        </div>
      </div>
    )
  }

  const words = line[0] === 'b' ? mushaf.bismillah.split(' ') : line[2]
  const centered = line[0] === 'b' || line[1] === 1

  return (
    <div
      ref={ref}
      onClick={onToggleMark}
      aria-pressed={onToggleMark ? marked : undefined}
      className={cn(rowCls, onToggleMark && 'cursor-pointer', marked && 'bg-amber-100/70')}
    >
      <div
        className={cn(
          'flex w-full items-center font-quran text-[6.6cqw] leading-[1.5] whitespace-nowrap',
          centered ? 'justify-center gap-[0.9cqw]' : 'justify-between',
        )}
        style={scale < 1 ? { transform: `scaleX(${scale})`, transformOrigin: 'center' } : undefined}
      >
        {words.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      {/* "Stopped here" ribbon at the start (right edge) of the marked line */}
      {marked && (
        <Bookmark
          aria-label="Stopped here"
          className="absolute top-0 right-[-0.4cqw] h-[4.2cqw] w-[4.2cqw] fill-amber-500 text-amber-600"
        />
      )}
    </div>
  )
}
