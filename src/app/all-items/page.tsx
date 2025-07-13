import FilterLayout from '@/shared/components/layouts/FilterLayout'
import { Button } from '@/shared/components/ui/button'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import { Badge } from '@/shared/components/ui/badge'
import { MoreHorizontal } from 'lucide-react'

const items = [
  {
    id: 1,
    name: 'Homepage Redesign',
    type: 'Project',
    status: 'In Progress',
    priority: 'High',
    dueDate: '2024-03-15',
  },
  {
    id: 2,
    name: 'User Authentication',
    type: 'Task',
    status: 'Completed',
    priority: 'Medium',
    dueDate: '2024-03-10',
  },
  {
    id: 3,
    name: 'API Documentation',
    type: 'Document',
    status: 'Review',
    priority: 'Low',
    dueDate: '2024-03-20',
  },
]

export default function AllItemsPage() {
  return (
    <FilterLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">All Items</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline">Export</Button>
            <Button variant="outline">Filter</Button>
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.type}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                  <TableCell>{item.priority}</TableCell>
                  <TableCell>{item.dueDate}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </FilterLayout>
  )
} 