import { ReactNode } from "react";

export interface TableColumn<T> {
  header: string;
  /** Optional: hide this column below the given breakpoint to reduce clutter on small screens. */
  hideBelow?: "sm" | "md" | "lg";
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyState?: ReactNode;
}

const HIDE_CLASS: Record<NonNullable<TableColumn<unknown>["hideBelow"]>, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
};

/**
 * One generic table drives every management screen (products, categories,
 * orders, payments, shipping) instead of five near-identical hand-rolled
 * tables. Wide tables scroll horizontally within their own container so the
 * page itself never overflows.
 */
export function Table<T>({ columns, rows, getRowKey, emptyState }: TableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={`whitespace-nowrap px-4 py-3.5 ${
                  column.hideBelow ? HIDE_CLASS[column.hideBelow] : ""
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={`whitespace-nowrap px-4 py-3.5 text-slate-700 dark:text-slate-200 ${
                    column.hideBelow ? HIDE_CLASS[column.hideBelow] : ""
                  }`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
