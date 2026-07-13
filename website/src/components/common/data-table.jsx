import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function DataTable({ columns, rows }) {
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
            {rows.map((row, idx) => (
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
    </Card>
  )
}
