"use client"

interface SkeletonTableRowProps {
  columns: number;
}

export function SkeletonTableRow({ columns }: SkeletonTableRowProps) {
  return (
    <tr className="animate-pulse">
      {Array(columns).fill(0).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-[120px]"></div>
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array(rows).fill(0).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </>
  );
} 