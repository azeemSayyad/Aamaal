import { Bookmark, BookOpen, ChevronRight, Search, Star, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomNav, NAV_SPACE, PageHeader } from '../components/layout'
import { Card, ErrorState, PageLoader, Segmented, SectionTitle } from '../components/ui'
import {
  favouriteSurahs,
  getLastPage,
  printedPage,
  readingMark,
  searchMushaf,
  toggleFavouriteSurah,
  useMushaf,
  type Mushaf,
} from '../lib/quran'
import { cn } from '../lib/utils'

/**
 * Quran menu (/quran): search, continue reading (exact line), daily surahs, para & surah lists.
 * Works for everyone; shows the bottom bar only when logged in.
 */
export function QuranHomePage() {
  const navigate = useNavigate()
  const { data: mushaf, isLoading, error, refetch } = useMushaf()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'surah' | 'para'>('surah')
  const mark = readingMark.use()
  const favs = favouriteSurahs.use()

  const results = useMemo(() => (mushaf ? searchMushaf(mushaf, query) : []), [mushaf, query])
  const open = (page: number) => navigate(`/quran/read?page=${page}`)

  return (
    <div className={cn('mx-auto min-h-dvh max-w-lg bg-stone-50 sm:border-x sm:border-stone-200', NAV_SPACE)}>
      <PageHeader title="Quran" subtitle="13-line IndoPak" />

      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : isLoading || !mushaf ? (
        <PageLoader />
      ) : (
        <div className="space-y-5 px-4 pt-4 pb-8">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search surah, para or page"
              aria-label="Search surah, para or page"
              className="h-11 w-full rounded-xl border border-stone-300 bg-white pr-9 pl-10 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-stone-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {query.trim() ? (
            results.length ? (
              <Card className="divide-y divide-stone-100 overflow-hidden">
                {results.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => open(r.page)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-stone-50"
                  >
                    <span className="w-14 shrink-0 rounded-full bg-emerald-50 py-0.5 text-center text-[11px] font-bold text-emerald-800">
                      {r.kind}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-stone-900">{r.title}</span>
                      <span className="text-[11px] text-stone-500">page {printedPage(r.page)}</span>
                    </span>
                    {r.ar && <span className="font-quran text-lg text-emerald-900">{r.ar}</span>}
                  </button>
                ))}
              </Card>
            ) : (
              <p className="py-6 text-center text-sm text-stone-500">Nothing found</p>
            )
          ) : (
            <>
              <ContinueCard mushaf={mushaf} mark={mark} onOpen={open} />

              {/* Daily surahs */}
              {favs.length > 0 && (
                <section>
                  <SectionTitle>Daily surahs</SectionTitle>
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
                    {favs
                      .map((n) => mushaf.surahs[n - 1])
                      .filter(Boolean)
                      .map((s) => (
                        <button
                          key={s.n}
                          onClick={() => open(s.page)}
                          className="flex w-24 shrink-0 flex-col items-center rounded-2xl bg-white px-2 py-3 shadow-xs ring-1 ring-stone-200/70 active:scale-95"
                        >
                          <span className="font-quran text-xl leading-tight text-emerald-900">{s.ar}</span>
                          <span className="mt-1 w-full truncate text-center text-[11px] font-semibold text-stone-600">
                            {s.en}
                          </span>
                        </button>
                      ))}
                  </div>
                </section>
              )}

              {/* Browse */}
              <section>
                <Segmented
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'surah', label: 'Surah' },
                    { value: 'para', label: 'Para' },
                  ]}
                />
                <div className="mt-3">
                  {tab === 'para' ? (
                    <div className="grid grid-cols-5 gap-2">
                      {mushaf.juz.map((j) => (
                        <button
                          key={j.n}
                          onClick={() => open(j.page)}
                          className="h-12 rounded-xl bg-white text-base font-bold text-emerald-900 shadow-xs ring-1 ring-stone-200/70 active:bg-emerald-50"
                        >
                          {j.n}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Card className="divide-y divide-stone-100 overflow-hidden">
                      {mushaf.surahs.map((s) => {
                        const fav = favs.includes(s.n)
                        return (
                          <div key={s.n} className="flex items-center">
                            <button
                              onClick={() => open(s.page)}
                              className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left active:bg-stone-50"
                            >
                              <span className="w-7 shrink-0 text-center text-xs font-bold text-stone-400">{s.n}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-stone-900">{s.en}</span>
                                <span className="text-[11px] text-stone-500">
                                  {s.ayahs} ayahs · page {printedPage(s.page)}
                                </span>
                              </span>
                              <span className="font-quran text-lg text-emerald-900">{s.ar}</span>
                            </button>
                            <button
                              onClick={() => toggleFavouriteSurah(s.n)}
                              aria-pressed={fav}
                              aria-label={fav ? `Remove ${s.en} from daily surahs` : `Add ${s.en} to daily surahs`}
                              className="grid h-11 w-11 shrink-0 place-items-center"
                            >
                              <Star
                                className={cn('h-4 w-4', fav ? 'fill-amber-400 text-amber-500' : 'text-stone-300')}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </Card>
                  )}
                </div>
              </section>

              <p className="text-center text-[11px] text-stone-400">
                13-line IndoPak (Taj Company) layout, script &amp; font: Quranic Universal Library by Tarteel
              </p>
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  )
}

/** Opens the "stopped here" line if marked, otherwise the last page read */
function ContinueCard({
  mushaf,
  mark,
  onOpen,
}: {
  mushaf: Mushaf
  mark: { page: number; line: number } | null
  onOpen: (page: number) => void
}) {
  const page = Math.min(mark?.page ?? getLastPage(), mushaf.pages.length)
  const info = mushaf.pages[page - 1]
  const surah = info?.surah ? mushaf.surahs[info.surah - 1] : undefined

  return (
    <button
      onClick={() => onOpen(page)}
      className="relative flex w-full items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4 text-left text-white shadow-lg shadow-emerald-900/20 active:scale-[0.99]"
    >
      <span aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15">
        {mark ? <Bookmark className="h-6 w-6 fill-white/90" /> : <BookOpen className="h-6 w-6" />}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="text-xs font-semibold tracking-wider text-emerald-100/90 uppercase">Continue reading</div>
        <div className="truncate text-lg font-bold">{surah?.en ?? 'Al-Fatihah'}</div>
        <div className="text-xs text-emerald-100">
          Para {info?.juz} · Page {printedPage(page)}
          {mark && ` · Line ${mark.line + 1}`}
        </div>
      </div>
      <ChevronRight className="relative h-5 w-5 text-emerald-100" />
    </button>
  )
}
