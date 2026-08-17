import { sheetPageCount } from '@/lib/sheets'

interface SheetPaginationProps {
  current: number
  sheetCount: number
  onChange: (next: number) => void
}

export default function SheetPagination({ current, sheetCount, onChange }: SheetPaginationProps) {
  const pageCount = sheetPageCount(sheetCount)

  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        onClick={() => onChange(Math.max(0, current - 1))}
        disabled={current === 0}
        className="h-10 rounded-xl bg-slate-800 px-5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
      >
        ◄ Anterior
      </button>
      <span className="text-sm font-medium text-slate-500">
        {current + 1} / {pageCount}
      </span>
      <button
        onClick={() => onChange(Math.min(pageCount - 1, current + 1))}
        disabled={current + 1 >= pageCount}
        className="h-10 rounded-xl bg-slate-800 px-5 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-40"
      >
        Siguiente ►
      </button>
    </div>
  )
}
