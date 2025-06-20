'use client'

import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function SummaryHeader() {
  return (
    <thead>
      <tr className="bg-slate-50/50 border-b border-slate-200/50">
        <th className="px-4 py-2.5 text-left font-medium text-slate-700 text-sm">Name</th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            Original
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                The originally estimated amount from the project estimate
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            Actual
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                The total actual amount spent so far
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            Difference
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                The difference between original estimate and actual spending
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            Paid Bills
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                Bills that have been paid
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            External Bills
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                Bills paid by external parties
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-right font-medium text-slate-700 text-sm">
          <div className="flex items-center justify-end">
            Pending Bills
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoCircledIcon className="h-3.5 w-3.5 ml-1.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>
                Bills that are pending payment
              </TooltipContent>
            </Tooltip>
          </div>
        </th>
        <th className="px-4 py-2.5 text-center font-medium text-slate-700 text-sm w-16"></th>
      </tr>
    </thead>
  )
} 