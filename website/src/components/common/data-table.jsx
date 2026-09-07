import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DataTable({ columns, rows, pageSize }) {
  const [page, setPage] = useState(1)

  // Reset to page 1 whenever the rows or pageSize changes (e.g. after a filter)
  useEffect(() => { setPage(1) }, [rows, pageSize])

  const paginated = pageSize ? rows.slice((page - 1) * pageSize, page * pageSize) : rows
  const totalPages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-semibold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((row, idx) => (
              <tr key={idx} className={cn('border-t border-border/70', idx % 2 === 0 ? 'bg-card' : 'bg-muted/30')}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3 align-top">
                    {typeof column.render === 'function' ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination bar — only shown when pageSize is provided */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
          <span>
            Showing {Math.min((page - 1) * pageSize + 1, rows.length)}–{Math.min(page * pageSize, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, i, arr) => {
                if (i > 0 && p - arr[i - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((item, i) =>
                item === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-lg border text-sm font-medium transition',
                      item === page
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
