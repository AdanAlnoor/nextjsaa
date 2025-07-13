'use client'

interface SummaryTotalRowProps {
  totals: {
    original: number
    actual: number
    difference: number
    paidBills: number
    externalBills: number
    pendingBills: number
  }
}

export function SummaryTotalRow({ totals }: SummaryTotalRowProps) {
  // Format currency with thousands separator
  const formatCurrency = (amount: number) => {
    return `Ksh ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  
  return (
    <tr className="bg-gray-50 border-t-2 font-semibold">
      <td className="px-4 py-3">Estimate</td>
      <td className="px-4 py-3 text-right">
        {formatCurrency(totals.original)}
      </td>
      <td className="px-4 py-3 text-right">
        {totals.actual > 0 ? formatCurrency(totals.actual) : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        <span className="text-green-600">
          +{formatCurrency(totals.original)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {totals.paidBills > 0 ? formatCurrency(totals.paidBills) : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        {totals.externalBills > 0 ? formatCurrency(totals.externalBills) : "-"}
      </td>
      <td className="px-4 py-3 text-right">
        {totals.pendingBills > 0 ? formatCurrency(totals.pendingBills) : "-"}
      </td>
    </tr>
  )
} 