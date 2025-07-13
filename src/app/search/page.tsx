import FilterLayout from '@/shared/components/layouts/FilterLayout'
import { Input } from '@/shared/components/ui/input'
import { Search as SearchIcon } from 'lucide-react'

export default function SearchPage() {
  return (
    <FilterLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search everything..." 
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Recent Searches</h2>
          </div>
          <div className="divide-y">
            {['Project documentation', 'Team members', 'Task status', 'Meeting notes'].map((search, i) => (
              <div key={i} className="p-4 hover:bg-muted/50 cursor-pointer">
                <p className="text-sm">{search}</p>
                <p className="text-xs text-muted-foreground">2 results</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </FilterLayout>
  )
} 