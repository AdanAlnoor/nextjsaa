import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { EstimateItemWithChildren } from '@/types/estimate';
import { toast } from 'sonner';
import { downloadExcelTemplate } from '@/lib/excel-template';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Database } from '@/types/supabase';

interface ExcelImportProps {
  parentId: string;
  projectId?: string;
  level?: number;
  currentOrder?: number;
  onImport: (items: Database['public']['Tables']['estimate_items']['Insert'][]) => void;
}

interface ExcelRow {
  name: string;
  quantity: string;
  unit: string;
  rate: string;
}

const REQUIRED_COLUMNS: (keyof ExcelRow)[] = ['name', 'quantity', 'unit', 'rate'];

export function ExcelImport({ 
  parentId, 
  projectId = 'project1', 
  level = 2,
  currentOrder = 0,
  onImport 
}: ExcelImportProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const parseNumber = (value: string): number | undefined => {
    if (!value) return undefined;
    const num = parseFloat(value.toString().replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  };

  const validateColumns = (headers: string[]): boolean => {
    const missingColumns = REQUIRED_COLUMNS.filter(
      col => !headers.map(h => h.toLowerCase()).includes(col)
    );

    if (missingColumns.length > 0) {
      toast.error('Invalid Excel Format', {
        description: `Missing required columns: ${missingColumns.join(', ')}`
      });
      return false;
    }
    return true;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Log file details
    console.log('File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel'
    ];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid File Type', {
        description: 'Please upload an Excel (.xlsx or .xls) file'
      });
      return;
    }

    setIsLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // Log worksheet details
      console.log('Worksheet details:', {
        name: workbook.SheetNames[0],
        range: worksheet['!ref']
      });
      
      // Get headers to validate
      const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
      console.log('Found headers:', headers);
      
      const normalizedHeaders = headers.map(h => h.toString().toLowerCase().trim());
      console.log('Normalized headers:', normalizedHeaders);
      
      // Check for required columns
      const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedHeaders.includes(col));
      if (missingColumns.length > 0) {
        toast.error('Invalid Excel Format', {
          description: `Missing required columns: ${missingColumns.join(', ')}`
        });
        setIsLoading(false);
        return;
      }

      const data = XLSX.utils.sheet_to_json<ExcelRow>(worksheet, { raw: false });
      console.log('Parsed Excel data:', data);

      // Validate data
      if (data.length === 0) {
        toast.error('Empty File', {
          description: 'The Excel file contains no data'
        });
        setIsLoading(false);
        return;
      }

      // Transform the data
      const items: Database['public']['Tables']['estimate_items']['Insert'][] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        console.log(`Processing row ${i + 1}:`, row);
        
        // Skip empty rows
        if (!row.name?.trim()) {
          console.log(`Skipping row ${i + 1}: Empty name`);
          continue;
        }

        const quantity = parseNumber(row.quantity);
        const rate = parseNumber(row.rate);

        console.log(`Row ${i + 1} parsed values:`, {
          quantity,
          rate,
          unit: row.unit?.trim()
        });

        // Validate required fields
        if (quantity === undefined || rate === undefined) {
          const error = `Row ${i + 1}: Quantity and Rate must be valid numbers`;
          console.error(error, { quantity, rate });
          toast.error('Invalid Data', { description: error });
          setIsLoading(false);
          return;
        }

        if (!row.unit?.trim()) {
          const error = `Row ${i + 1}: Unit is required`;
          console.error(error);
          toast.error('Invalid Data', { description: error });
          setIsLoading(false);
          return;
        }

        const item: Database['public']['Tables']['estimate_items']['Insert'] = {
          name: row.name.trim(),
          project_id: projectId || '',
          parent_id: parentId,
          level: level,
          order: currentOrder + i + 1,
          quantity: quantity,
          unit: row.unit.trim(),
          unit_cost: rate,
          amount: quantity * rate,
          is_parent: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`Created item from row ${i + 1}:`, item);
        items.push(item);
      }

      if (items.length === 0) {
        toast.error('No Valid Data', {
          description: 'No valid items found in the Excel file'
        });
        setIsLoading(false);
        return;
      }

      // Log final items array before sending
      console.log('Final items to import:', items);

      onImport(items);
      toast.success('Excel Import Successful', {
        description: `Imported ${items.length} items`
      });
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error importing Excel:', error);
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      toast.error('Import Failed', {
        description: error instanceof Error 
          ? error.message 
          : 'An error occurred while importing the Excel file. Please check the file format and try again.'
      });
    } finally {
      setIsLoading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-2"
      >
        <Upload className="h-4 w-4" />
        Import Excel
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Excel Items</DialogTitle>
            <DialogDescription>
              Import multiple items using an Excel template. The template requires the following columns:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>name - Item description</li>
                <li>quantity - Numeric value</li>
                <li>unit - Unit of measurement</li>
                <li>rate - Unit rate in currency</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4">
            <Button 
              variant="outline" 
              onClick={downloadExcelTemplate}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>

            <div className="flex flex-col gap-2">
              <label htmlFor="excel-file" className="text-sm font-medium">
                Upload Excel File
              </label>
              <input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="border rounded p-2 text-sm"
                disabled={isLoading}
              />
              {isLoading && <p className="text-sm text-muted-foreground">Processing...</p>}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 flex gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Important</p>
                <p>Make sure your Excel file follows the template format. All items will be added as level 2 items under the current parent.</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 