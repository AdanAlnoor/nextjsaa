import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'

interface ViewBillButtonProps {
  billId: string | null
  projectId: string
}

export function ViewBillButton({ billId, projectId }: ViewBillButtonProps) {
  const router = useRouter()

  if (!billId) return null

  const handleViewBill = () => {
    // Use router.push instead of window.location for consistent navigation
    console.log(`View bill button clicked for bill: – "${billId}"`)
    router.push(`/projects/${projectId}/cost-control/bills?view=${billId}`)
  }

  return (
    <Button 
      className="bg-purple-600 hover:bg-purple-700"
      onClick={handleViewBill}
    >
      View Bill
    </Button>
  )
} 