import { Button } from '@/shared/components/ui/button';
import { Loader2, ArrowDownToLine } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ImportFromEstimateButtonProps {
  projectId: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSuccess?: (() => void) | ((options?: { force?: boolean; silent?: boolean }) => Promise<void>);
}

export function ImportFromEstimateButton({
  projectId,
  variant = 'outline',
  size = 'sm',
  className = '',
  onSuccess
}: ImportFromEstimateButtonProps) {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (isImporting) return;
    
    try {
      setIsImporting(true);
      
      const response = await fetch(`/api/projects/${projectId}/estimate-import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recalculateParents: true
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success(result.warning 
          ? `Import completed with warnings: ${result.warning}` 
          : 'Data imported from Estimate successfully');
          
        if (onSuccess) {
          await onSuccess();
        }
      } else {
        toast.error(`Failed to import data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error importing data:', error);
      toast.error('An error occurred while importing data');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleImport}
      disabled={isImporting}
      className={className}
    >
      {isImporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        <>
          <ArrowDownToLine className="mr-2 h-4 w-4" />
          Import from Estimate
        </>
      )}
    </Button>
  );
} 