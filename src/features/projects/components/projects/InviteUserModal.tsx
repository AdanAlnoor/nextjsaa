'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/components/ui/form"

// Local Role type definition (adjust if your actual role structure differs)
type Role = {
  id: string;
  role_name: string;
};

// Zod schema for form validation
const formSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleId: z.string().min(1, 'Role is required') // Role ID (string/UUID)
})

// Component props
interface InviteUserModalProps {
  projectId: string
  onInviteSent?: () => void
  triggerElement?: React.ReactNode
}

export default function InviteUserModal({ 
    projectId, 
    onInviteSent, 
    triggerElement = <Button>Invite User</Button> 
}: InviteUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  
  // Fetch available roles 
  useEffect(() => {
    const fetchRoles = async () => {
      // --- Placeholder Data --- 
      console.warn("InviteUserModal: Using placeholder role data. Implement actual role fetching.");
      const placeholderRoles: Role[] = [
        { id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', role_name: 'Viewer' }, // Example UUIDs
        { id: 'e837a7bc-1d6f-4a1d-9c5b-2a8ae0274f65', role_name: 'Editor' },
      ];
      setAvailableRoles(placeholderRoles);
      // --- End Placeholder --- 
    };

    if (isOpen) { 
      fetchRoles();
    }
  }, [isOpen]); 

  // Initialize react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      roleId: '',
    },
  })

  // Handle form submission
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    const toastId = toast.loading('Sending invitation...')

    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: values.email, roleId: values.roleId }), 
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send invitation via API')
      }

      toast.success('Invitation sent successfully!', { id: toastId })
      form.reset()
      setIsOpen(false)
      onInviteSent?.()

    } catch (error: any) {
      console.error('Error sending invitation (onSubmit):', error)
      toast.error(error.message || 'An unexpected error occurred', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render the modal with the form
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite User to Project</DialogTitle>
          <DialogDescription>
            Enter the email address and select a role for the user you want to invite.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.length > 0 ? (
                        availableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export { InviteUserModal } 