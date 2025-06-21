import DefaultLayout from '@/components/layouts/DefaultLayout'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

export default function CalendarPage() {
  return (
    <DefaultLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Calendar</h1>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Event
          </Button>
        </div>

        <div className="rounded-lg border">
          <div className="grid grid-cols-7 gap-px border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="min-h-[100px] p-2 hover:bg-muted/50">
                <span className="text-sm">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DefaultLayout>
  )
} 