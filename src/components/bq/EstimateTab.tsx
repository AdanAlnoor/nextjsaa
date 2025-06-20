'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Database } from '@/types/supabase'
import { Plus, Search, ChevronDown, Upload, FileSpreadsheet, Eye, Lock, Unlock, Download, FileText, ChevronRight, Loader2, Database as DatabaseIcon, TrendingUp, DollarSign, PencilIcon, TrashIcon } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Separator } from "@/components/ui/separator"
import { Info } from 'lucide-react'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import dynamic from 'next/dynamic'
import { EstimateService } from '@/lib/services/estimate.service'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AddEstimateDialog } from './AddEstimateDialog'
import { EditEstimateDialog } from './EditEstimateDialog'
import { createClient } from '@/utils/supabase/client'
import { CostControlProvider } from '@/context/CostControlContext'

type Project = Database['public']['Tables']['projects']['Row']

type DatabaseEstimateItem = Database['public']['Tables']['estimate_items']['Row'];

interface BaseEstimateItem {
  id: string;
  name: string;
  status: 'Incomplete' | 'Complete';
  amount: number;
  parent_id?: string | null;
  level: number;
  order: number;
  project_id: string;
  created_at: string;
  updated_at: string;
  index: string;
  children: any[];
}

interface Level0Item extends BaseEstimateItem {
  children: Level1Item[];
}

interface Level1Item extends BaseEstimateItem {
  children: Level2Item[];
}

interface Level2Item extends BaseEstimateItem {
  costType: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  children: never[];
}

type EstimateItem = Level0Item | Level1Item | Level2Item;

interface Totals {
  projectTotal: number;
  totalProfit: number;
  totalOverheads: number;
}

// Create a client-only timestamp component
const ClientTimestamp = dynamic(() => Promise.resolve(() => {
  const [time, setTime] = useState(new Date().toLocaleString())
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleString())
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])
  
  return <span>{time}</span>
}), { ssr: false })

export function EstimateTab({ project }: { project: Project }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  
  // Fetch estimate data
  const { data: estimateData, isLoading } = useQuery({
    queryKey: ['estimate', project.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estimate_items_view')
        .select('*')
        .eq('project_id', project.id)
        .order('order', { ascending: true });

      if (error) {
        console.error('Error fetching estimate data:', error);
        throw error;
      }
      
      return data || [];
    }
  })

  // Fetch totals
  const { data: totals } = useQuery({
    queryKey: ['estimate-totals', project.id],
    queryFn: () => EstimateService.calculateTotals(project.id)
  })

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: async (item: Database['public']['Tables']['estimate_items']['Insert']) => {
      try {
        
        // Use EstimateService which handles the proper table routing and field mapping
        return await EstimateService.createEstimateItem(item);
      } catch (error) {
        console.error('Error in createItemMutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estimate', project.id] });
      toast.success('Item added successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to add item');
    }
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string, updates: Database['public']['Tables']['estimate_items']['Update'] }) =>
      EstimateService.updateEstimateItem(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', project.id] })
      toast.success('Item updated successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to update item')
    }
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => EstimateService.deleteEstimateItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimate', project.id] })
      toast.success('Item deleted successfully')
    },
    onError: (error: Error) => {
      toast.error('Failed to delete item')
    }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [addLevel, setAddLevel] = useState<0 | 1 | 2>(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [itemToEdit, setItemToEdit] = useState<DatabaseEstimateItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    status: 'incomplete',
    amount: '',
    costType: '',
    quantity: '',
    unit: '',
    unit_cost: ''
  })
  const [visibleColumns, setVisibleColumns] = useState({
    Quantity: true,
    Unit: true,
    Rate: true,
    Amount: true,
    Material: true,
    Labour: true,
    Equipment: true,
    Overheads: true,
    Profit: true,
    VAT: true
  })
  const [isSeeding, setIsSeeding] = useState(false)

  // Toggle column visibility
  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column as keyof typeof visibleColumns]
    }))
  }

  // Toggle expand/collapse all
  const toggleExpandAll = () => {
    setIsExpanded(!isExpanded)
    // Propagate the expansion state to all rows
    const rows = document.querySelectorAll('[data-expandable="true"]')
    rows.forEach((row) => {
      // Update the expansion state of each row
      // This will be handled by the EstimateRow component
    })
  }

  // Helper function to check if item is Level2Item
  const isLevel2Item = (item: EstimateItem): item is Level2Item => {
    return item.level === 2;
  };

  // Helper function to calculate totals from children
  const calculateChildrenTotal = (
    item: Level0Item | Level1Item, 
    calculator: (item: Level2Item) => number
  ): number => {
    if (!item.children || item.children.length === 0) {
      return 0;
    }
    
    return item.children.reduce((total, child) => {
      if (isLevel2Item(child)) {
        return total + calculator(child);
      } else if (child.children && child.children.length > 0) {
        return total + calculateChildrenTotal(child as Level0Item | Level1Item, calculator);
      }
      return total;
    }, 0);
  };

  // Calculate totals for the current item
  const getMaterialCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.4;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.4);
  };

  const getLabourCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.3;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.3);
  };

  const getEquipmentCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.2;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.2);
  };

  const getOverheadsCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.05;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.05);
  };

  const getProfitCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.05;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.05);
  };

  const getVATCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.16;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.16);
  };

  // Helper function to get all visible data recursively
  const getExportData = (items: Level0Item[], level = 0, parentIndex = ''): any[] => {
    return items.flatMap((item, index) => {
      const currentIndex = parentIndex ? `${parentIndex}.${index + 1}` : `${index + 1}`;
      const isLevel2 = isLevel2Item(item);
      
      const row = {
        Index: currentIndex,
        Description: item.name,
        Status: item.status,
        Quantity: isLevel2 ? item.quantity : undefined,
        Unit: isLevel2 ? item.unit : undefined,
        Rate: isLevel2 ? item.unit_cost : undefined,
        Amount: item.amount,
        Material: getMaterialCost(item),
        Labour: getLabourCost(item),
        Equipment: getEquipmentCost(item),
        Overheads: getOverheadsCost(item),
        Profit: getProfitCost(item),
        VAT: getVATCost(item)
      };

      const result = [row];
      if ('children' in item && item.children) {
        result.push(...getExportData(item.children, level + 1, currentIndex));
      }
      return result;
    });
  };

  // Export to Excel
  const handleExcelExport = () => {
    const data = getExportData(estimateData || []);
    const ws = XLSX.utils.json_to_sheet(data);

    // Style the worksheet
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let C = range.s.c; C <= range.e.c; C++) {
      const address = XLSX.utils.encode_col(C) + '1';
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "EEF2FF" } }, // Light blue background
        alignment: { horizontal: 'center' }
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estimate');
    XLSX.writeFile(wb, `${project.name || 'Estimate'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const handlePDFExport = () => {
    const data = getExportData(estimateData || []);
    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length + 2; // +2 for Index and Description
    const pageSize = visibleColumnCount > 8 ? 'A3' : 'A4';
    const pageOrientation = visibleColumnCount > 6 ? 'landscape' : 'portrait';

    const doc = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: pageSize
    });

    // Add modern header with project info and logo
    const pageWidth = doc.internal.pageSize.width;
    const headerHeight = 40;
    
    // Header background - Modern deep blue
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Project info section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text(project.name, 15, 25);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Project ID: ${project.id}`, 15, 35);
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth - 15, 35, { align: 'right' });

    // Summary section with modern card style
    const summaryY = headerHeight + 15;
    const summaryItems = [
      { label: 'Project Total', value: totals?.projectTotal ?? 0, color: [99, 102, 241] as [number, number, number] }, // indigo-500
      { label: 'Total Overheads', value: totals?.totalOverheads ?? 0, color: [59, 130, 246] as [number, number, number] }, // blue-500
      { label: 'Total Profit', value: totals?.totalProfit ?? 0, color: [34, 197, 94] as [number, number, number] }, // green-500
      { label: 'Grand Total', value: (totals?.projectTotal ?? 0) + (totals?.totalOverheads ?? 0) + (totals?.totalProfit ?? 0), color: [30, 41, 59] as [number, number, number] } // slate-800
    ];

    // Summary cards with modern styling
    const cardWidth = (pageWidth - 30 - (summaryItems.length - 1) * 10) / summaryItems.length;
    summaryItems.forEach((item, index) => {
      const cardX = 15 + (cardWidth + 10) * index;
      
      // Card background
      doc.setFillColor(249, 250, 251); // slate-50
      doc.setDrawColor(...(item.color as [number, number, number]));
      doc.roundedRect(cardX, summaryY, cardWidth, 30, 3, 3, 'FD');

      // Card content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(...(item.color as [number, number, number]));
      doc.text(item.label, cardX + 8, summaryY + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(
        `Ksh ${item.value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        cardX + 8,
        summaryY + 23
      );
    });

    // Configure the table with modern styling
    const headers = [
      'Index',
      'Description',
      ...(visibleColumns.Quantity ? ['Quantity'] : []),
      ...(visibleColumns.Unit ? ['Unit'] : []),
      ...(visibleColumns.Rate ? ['Rate (Ksh)'] : []),
      ...(visibleColumns.Amount ? ['Amount (Ksh)'] : []),
      ...(visibleColumns.Material ? ['Material (Ksh)'] : []),
      ...(visibleColumns.Labour ? ['Labour (Ksh)'] : []),
      ...(visibleColumns.Equipment ? ['Equipment (Ksh)'] : []),
      ...(visibleColumns.Overheads ? ['Overheads (Ksh)'] : []),
      ...(visibleColumns.Profit ? ['Profit (Ksh)'] : []),
      ...(visibleColumns.VAT ? ['VAT (Ksh)'] : [])
    ];

    const tableData = data.map(row => {
      const level = (row.Index.match(/\./g) || []).length;
      const formatNumber = (value: number | undefined) => {
        if (value === undefined || value === null) return '';
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      return [
        row.Index,
        '  '.repeat(level) + row.Description,
        ...(visibleColumns.Quantity ? [row.Quantity?.toString() || ''] : []),
        ...(visibleColumns.Unit ? [row.Unit || ''] : []),
        ...(visibleColumns.Rate ? [formatNumber(row.Rate)] : []),
        ...(visibleColumns.Amount ? [formatNumber(row.Amount)] : []),
        ...(visibleColumns.Material ? [formatNumber(row.Material)] : []),
        ...(visibleColumns.Labour ? [formatNumber(row.Labour)] : []),
        ...(visibleColumns.Equipment ? [formatNumber(row.Equipment)] : []),
        ...(visibleColumns.Overheads ? [formatNumber(row.Overheads)] : []),
        ...(visibleColumns.Profit ? [formatNumber(row.Profit)] : []),
        ...(visibleColumns.VAT ? [formatNumber(row.VAT)] : [])
      ];
    });

    // Add the table with modern styling
    (doc as any).autoTable({
      startY: summaryY + 45,
      head: [headers],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 6, right: 8, bottom: 6, left: 8 },
        lineColor: [241, 245, 249], // slate-100
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: { top: 8, right: 8, bottom: 8, left: 8 }
      },
      columnStyles: {
        0: { // Index
          cellWidth: 25,
          halign: 'center',
          fontStyle: 'bold'
        },
        1: { // Description
          cellWidth: 'auto',
          minCellWidth: 60
        },
        ...Array.from({ length: headers.length - 2 }, (_, i) => i + 2).reduce((acc, i) => ({
          ...acc,
          [i]: {
            cellWidth: 35,
            halign: 'right'
          }
        }), {})
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      didParseCell: function(data: any) {
        const level = (data.row.raw?.[0].match(/\./g) || []).length;
        if (level === 0 && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // slate-100
          data.cell.styles.textColor = [30, 41, 59]; // slate-800
          if (data.column.index === 1) { // Description column
            data.cell.styles.fontSize = 10;
          }
        } else if (data.section === 'body') {
          data.cell.styles.textColor = [71, 85, 105]; // slate-600
        }
      },
      didDrawPage: function(data: any) {
        // Add footer with modern styling
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        
        // Page number
        doc.text(
          `Page ${data.pageNumber} of ${data.pageCount}`,
          pageWidth - 20,
          doc.internal.pageSize.height - 15,
          { align: 'right' }
        );

        // Company info
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(0, doc.internal.pageSize.height - 25, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(
          'Generated by Estimate App',
          15,
          doc.internal.pageSize.height - 15
        );
      }
    });

    // Save the PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    doc.save(`${project.name}_Estimate_${timestamp}.pdf`);
  };

  // Transform database items into tree structure - memoized for performance  
  const transformToTree = useCallback((items: DatabaseEstimateItem[]): Level0Item[] => {
    
    const itemMap = new Map<string, any>();
    const roots: Level0Item[] = [];

    // First pass: Create all nodes
    items.forEach((item, index) => {
      const baseNode = {
        id: item.id,
        name: item.name,
        status: 'Incomplete' as 'Incomplete' | 'Complete',
        amount: item.amount || 0,
        parent_id: item.parent_id,
        level: item.level,
        order: item.order,
        project_id: item.project_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        index: (index + 1).toString(),
        children: []
      };

      let node;
      if (item.level === 2) {
        // Use type assertion to access rate property which exists in the view 
        // but not in the original type definition
        const rate = (item as any).rate || 0;
        
        node = {
          ...baseNode,
          costType: 'material', // Default value since cost_type has been removed
          quantity: item.quantity || 0,
          unit: item.unit || '',
          // Map rate from database to unit_cost in our model
          unit_cost: rate,
          children: [] as never[]
        } as Level2Item;
        
        // For level 2 items, calculate amount from quantity and rate
        if (item.quantity && rate) {
          node.amount = item.quantity * rate;
        }
        
      } else if (item.level === 1) {
        node = {
          ...baseNode,
          children: [] as Level2Item[]
        } as Level1Item;
      } else {
        node = {
          ...baseNode,
          children: [] as Level1Item[]
        } as Level0Item;
      }

      itemMap.set(item.id, node);
    });

    // Second pass: Create tree structure and update indices
    items.forEach((item) => {
      const node = itemMap.get(item.id);
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children.push(node);
          // Update child index based on parent's index
          const childIndex = parent.children.length;
          node.index = `${parent.index}.${childIndex}`;
        } else {
        }
      } else {
        roots.push(node as Level0Item);
      }
    });

    
    // Third pass: Calculate parent costs from children
    const calculateParentCost = (node: EstimateItem): number => {
      if (isLevel2Item(node)) {
        return node.amount;
      }
      
      const childrenCost = node.children.reduce((sum, child) => {
        return sum + calculateParentCost(child);
      }, 0);
      
      node.amount = childrenCost;
      return childrenCost;
    };

    // Calculate costs for all root nodes
    roots.forEach(root => calculateParentCost(root));

    return roots;
  }, []);

  // Filter items based on search and status - memoized for performance
  const filterItems = useCallback((items: Level0Item[]): Level0Item[] => {
    const searchLower = searchQuery.toLowerCase();
    
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchLower)
      const matchesStatus = selectedStatus === 'all' || item.status.toLowerCase() === selectedStatus
      
      if (!matchesSearch && !matchesStatus) {
        return false;
      }
      
      if ('children' in item && item.children) {
        const filteredChildren = filterItems(item.children as Level0Item[]) as Level1Item[]
        item.children = filteredChildren
        const keepDueToChildren = filteredChildren.length > 0;
        const keepDueToSelf = matchesSearch;
        
        return filteredChildren.length > 0 || matchesSearch
      }
      
      return true
    })
  }, [searchQuery, selectedStatus])

  // Calculate total values for footer
  const calculateTotalValues = (items: Level0Item[]): Totals => {
    // Only sum Level 0 items for project total
    const projectTotal = items.reduce((sum, item) => sum + item.amount, 0);
    
    let totalProfit = 0;
    let totalOverheads = 0;

    const processItem = (item: EstimateItem) => {
      totalProfit += getProfitCost(item);
      totalOverheads += getOverheadsCost(item);

      if ('children' in item && item.children) {
        item.children.forEach(processItem);
      }
    };

    items.forEach(processItem);
    
    return { projectTotal, totalProfit, totalOverheads };
  };

  // Memoize tree transformation to prevent unnecessary recalculations
  const treeData = useMemo(() => {
    return estimateData ? transformToTree(estimateData) : [];
  }, [estimateData, transformToTree]);

  // Memoize filtering to prevent unnecessary recalculations
  const filteredTreeData = useMemo(() => {
    return filterItems(treeData);
  }, [treeData, filterItems]);

  // Memoize total calculations
  const calculatedTotals = useMemo(() => {
    return calculateTotalValues(filteredTreeData);
  }, [filteredTreeData]);
  

  const formatCurrency = (value: number) => value.toLocaleString();

  // Add select all/none functionality
  const toggleAllColumns = (value: boolean) => {
    setVisibleColumns(prev => {
      const newState = { ...prev }
      Object.keys(prev).forEach(key => {
        newState[key as keyof typeof visibleColumns] = value
      })
      return newState
    })
  }

  // Group columns by type
  const columnGroups = {
    'Basic Information': ['Quantity', 'Unit', 'Rate', 'Amount'],
    'Cost Breakdown': ['Material', 'Labour', 'Equipment'],
    'Additional Costs': ['Overheads', 'Profit', 'VAT']
  }

  // Add the handler function
  const handleSeedData = async () => {
    try {
      setIsSeeding(true)
      const response = await fetch('/api/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectName: project.name }),
      })

      if (!response.ok) {
        throw new Error('Failed to seed data')
      }

      const result = await response.json()
      queryClient.invalidateQueries({ queryKey: ['estimate', project.id] })
      toast.success('Sample estimate data added successfully')
    } catch (error) {
      toast.error('Failed to add sample data')
    } finally {
      setIsSeeding(false)
    }
  }

  // Update the handleAddStructure function
  const handleAddStructure = (parentId: string | null = null, level: 0 | 1 | 2) => {
    if (isLocked) return
    setSelectedParentId(parentId)
    setAddLevel(level)
    setIsAddDialogOpen(true)
  }

  // Add the handleAddItem function
  const handleAddItem = async (item: Database['public']['Tables']['estimate_items']['Insert']) => {
    try {
      await addItemMutation.mutateAsync(item);
      setIsAddDialogOpen(false);
    } catch (error) {
      // Keep dialog open on error to allow retry
    }
  }

  const handleEditItem = (item: DatabaseEstimateItem) => {
    setItemToEdit(item);
    setIsEditDialogOpen(true);
  };

  return (
    <CostControlProvider projectId={project.id}>
      <div className="container-fluid px-4 py-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              <span className="text-indigo-500 dark:text-indigo-400">Estimate</span>
            </h1>
            <p className="text-muted-foreground">
              <span className="font-medium">Project:</span> {project.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search items..."
                className="pl-8 border-indigo-200 dark:border-indigo-800/40 focus-visible:ring-indigo-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select
              value={selectedStatus}
              onValueChange={setSelectedStatus}
            >
              <SelectTrigger className="w-[160px] border-indigo-200 dark:border-indigo-800/40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExcelExport}>
                  <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600 dark:text-green-500" />
                  Export to Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePDFExport}>
                  <FileText className="mr-2 h-4 w-4 text-red-600 dark:text-red-500" />
                  Export to PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={toggleExpandAll}
              variant="outline"
              className="border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              {isExpanded ? (
                <>
                  <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500" /> Collapse All
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-500" /> Expand All
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsLocked(!isLocked)}
              className={`border-indigo-200 dark:border-indigo-800/40 ${isLocked ? 'text-amber-600 dark:text-amber-500' : 'text-green-600 dark:text-green-500'}`}
            >
              {isLocked ? (
                <>
                  <Lock className="mr-2 h-4 w-4" /> Locked
                </>
              ) : (
                <>
                  <Unlock className="mr-2 h-4 w-4" /> Unlocked
                </>
              )}
            </Button>
            
            <Button
              variant="default"
              onClick={() => handleAddStructure(null, 0)}
              disabled={isLocked || addItemMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Structure
            </Button>

            <AddEstimateDialog
              isOpen={isAddDialogOpen}
              onClose={() => setIsAddDialogOpen(false)}
              onAdd={handleAddItem}
              level={addLevel}
              parentId={selectedParentId}
              projectId={project.id}
              currentOrder={estimateData?.length || 0}
            />

            <EditEstimateDialog
              isOpen={isEditDialogOpen}
              onClose={() => setIsEditDialogOpen(false)}
              onUpdate={(id, updates) => updateItemMutation.mutateAsync({ id, updates })}
              item={itemToEdit}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Table Container - Scrollable - Full width */}
            <div className="flex-1 overflow-auto min-h-0 w-full">
              <table className="w-full text-sm bg-background rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 shadow-sm">
                <thead>
                  <tr className="bg-indigo-50 dark:bg-indigo-950/30">
                    <th className="py-4 px-2 w-[40px] first:rounded-tl-xl">
                      <Checkbox 
                        disabled={isLocked}
                        className={`${isLocked ? 'cursor-not-allowed opacity-50' : ''} data-[state=checked]:bg-indigo-500`}
                      />
                    </th>
                    <th className="py-4 px-4 text-center font-medium text-foreground w-[80px] border-l border-indigo-200/50 dark:border-indigo-800/30">Index</th>
                    <th className="py-4 px-4 text-left font-medium text-foreground min-w-[400px] border-l border-indigo-200/50 dark:border-indigo-800/30">Description</th>
                    {visibleColumns.Quantity && <th className="py-4 px-4 text-left font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Quantity</th>}
                    {visibleColumns.Unit && <th className="py-4 px-4 text-left font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Unit</th>}
                    {visibleColumns.Rate && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Rate (Ksh)</th>}
                    {visibleColumns.Amount && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Amount (Ksh)</th>}
                    {visibleColumns.Material && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Material (Ksh)</th>}
                    {visibleColumns.Labour && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Labour (Ksh)</th>}
                    {visibleColumns.Equipment && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Equipment (Ksh)</th>}
                    {visibleColumns.Overheads && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Overheads (Ksh)</th>}
                    {visibleColumns.Profit && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Profit (Ksh)</th>}
                    {visibleColumns.VAT && <th className="py-4 px-4 text-right font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">VAT (Ksh)</th>}
                    <th className="py-4 px-4 text-center font-medium text-foreground w-[120px] border-l border-indigo-200/50 dark:border-indigo-800/30">Actions</th>
                    <th className="w-[60px] last:rounded-tr-xl"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-indigo-200/50 dark:divide-indigo-800/30">
                  {filteredTreeData.map((item, idx) => (
                      <EstimateRow 
                        key={item.id} 
                        item={item} 
                        level={0}
                        index={(idx + 1).toString()}
                        onAddChild={(parentId, level) => handleAddStructure(parentId, level)}
                        onUpdate={(id, itemData) => {
                          // When the edit button is clicked, set the item to edit and open the dialog
                          const itemToEditData = estimateData?.find(item => item.id === id);
                          if (itemToEditData) {
                            setItemToEdit(itemToEditData);
                            setIsEditDialogOpen(true);
                          }
                        }}
                        onDelete={(id) => deleteItemMutation.mutateAsync(id)}
                        isLocked={isLocked}
                        visibleColumns={visibleColumns}
                        isExpanded={isExpanded}
                      />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer - Fixed */}
            <div className="flex-shrink-0 p-4 pt-2">
              <div className="flex items-center justify-between bg-background shadow-lg p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">Last updated: {estimateData?.[0]?.updated_at ? new Date(estimateData[0].updated_at).toLocaleString() : 'Never'}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-muted-foreground">Base Cost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-muted-foreground">Overheads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span className="text-xs text-muted-foreground">Profit</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/30">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    <div className="flex flex-col">
                      <span className="text-xs text-emerald-700 dark:text-emerald-400">Project Total</span>
                      <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Ksh {formatCurrency(calculatedTotals.projectTotal)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/30">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <div className="flex flex-col">
                      <span className="text-xs text-blue-700 dark:text-blue-400">Total Overheads</span>
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Ksh {formatCurrency(calculatedTotals.totalOverheads)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/30">
                    <DollarSign className="h-4 w-4 text-purple-500" />
                    <div className="flex flex-col">
                      <span className="text-xs text-purple-700 dark:text-purple-400">Total Profit</span>
                      <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Ksh {formatCurrency(calculatedTotals.totalProfit)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </CostControlProvider>
  )
}

function EstimateRow({ 
  item, 
  level = 0,
  index = '',
  onAddChild,
  onUpdate,
  onDelete,
  isLocked,
  visibleColumns,
  isExpanded: defaultExpanded
}: { 
  item: EstimateItem; 
  level: number;
  index?: string;
  onAddChild: (parentId: string, level: 0 | 1 | 2) => void;
  onUpdate: (id: string, updates: Partial<EstimateItem>) => void;
  onDelete: (id: string) => void;
  isLocked: boolean;
  visibleColumns: Record<string, boolean>;
  isExpanded: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isHovered, setIsHovered] = useState(false)
  const hasChildren = 'children' in item && item.children && item.children.length > 0

  // Helper function to check if item is Level2Item
  const isLevel2Item = (item: EstimateItem): item is Level2Item => {
    return item.level === 2;
  };

  // Helper function to calculate totals from children
  const calculateChildrenTotal = (
    item: Level0Item | Level1Item, 
    calculator: (item: Level2Item) => number
  ): number => {
    if (!item.children || item.children.length === 0) {
      return 0;
    }
    
    return item.children.reduce((total, child) => {
      if (isLevel2Item(child)) {
        return total + calculator(child);
      } else if (child.children && child.children.length > 0) {
        return total + calculateChildrenTotal(child as Level0Item | Level1Item, calculator);
      }
      return total;
    }, 0);
  };

  // Calculate totals for the current item
  const getMaterialCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.4;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.4);
  };

  const getLabourCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.3;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.3);
  };

  const getEquipmentCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.2;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.2);
  };

  const getOverheadsCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.05;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.05);
  };

  const getProfitCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.05;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.05);
  };

  const getVATCost = (item: EstimateItem) => {
    if (isLevel2Item(item)) {
      return item.amount * 0.16;
    }
    return calculateChildrenTotal(item as Level0Item | Level1Item, i => i.amount * 0.16);
  };

  // Effect to sync with parent's expand/collapse state
  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [defaultExpanded])

  const handleAddChild = (newLevel: 1 | 2) => {
    if (!isLocked) {
      onAddChild(item.id, newLevel)
    }
  }

  const handleEdit = () => {
    if (!isLocked) {
      onUpdate(item.id, item);
    }
  };

  return (
    <>
      <tr 
        className={`${level > 0 ? 'bg-indigo-50/50 dark:bg-indigo-950/10' : ''} group relative hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-all`}
        onMouseEnter={() => !isLocked && setIsHovered(true)}
        onMouseLeave={() => !isLocked && setIsHovered(false)}
      >
        <td className="py-3 px-2">
          <Checkbox 
            disabled={isLocked}
            className={`${isLocked ? 'cursor-not-allowed opacity-50' : ''} data-[state=checked]:bg-indigo-500`}
          />
        </td>
        <td className="py-3 px-4 text-center text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{index}</td>
        <td className="py-3 px-4 min-w-[400px] border-l border-indigo-200/50 dark:border-indigo-800/30">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {hasChildren ? (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`${!isLocked ? 'cursor-pointer hover:bg-indigo-200/50 dark:hover:bg-indigo-800/30 rounded transition-colors' : 'cursor-default'} p-1`}
              >
                <ChevronDown className={`h-4 w-4 transition-transform text-indigo-600 dark:text-indigo-400 ${!isExpanded ? '-rotate-90' : ''}`} />
              </button>
            ) : (
              <div className="w-6" />
            )}
            <div className="flex items-center gap-3">
              <span className={`${level === 0 ? 'font-medium text-indigo-800 dark:text-indigo-300' : 'text-foreground'} ${level === 1 ? 'font-medium text-indigo-700 dark:text-indigo-400' : ''}`}>
                {item.name}
              </span>
              {isHovered && level < 2 && !isLocked && (
                <>
                  {level === 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleAddChild(1)}
                      className="h-7 px-2.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-500 hover:text-white focus:bg-indigo-500 focus:text-white transition-all"
                      disabled={isLocked}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Element
                    </Button>
                  )}
                  {level === 1 && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleAddChild(2)}
                      className="h-7 px-2.5 text-xs bg-indigo-100 dark:bg-indigo-900/50 hover:bg-indigo-500 hover:text-white focus:bg-indigo-500 focus:text-white transition-all"
                      disabled={isLocked}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Item
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </td>
        {visibleColumns.Quantity && <td className="py-3 px-4 text-left text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{isLevel2Item(item) ? item.quantity : ''}</td>}
        {visibleColumns.Unit && <td className="py-3 px-4 text-left text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{isLevel2Item(item) ? item.unit : ''}</td>}
        {visibleColumns.Rate && <td className="py-3 px-4 text-right font-medium text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">
          {isLevel2Item(item) && item.unit_cost ? 
            item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
            : ''
          }
        </td>}
        {visibleColumns.Amount && <td className="py-3 px-4 text-right font-medium text-indigo-700 dark:text-indigo-400 border-l border-indigo-200/50 dark:border-indigo-800/30">
          {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>}
        {visibleColumns.Material && <td className="py-3 px-4 text-right text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{getMaterialCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        {visibleColumns.Labour && <td className="py-3 px-4 text-right text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{getLabourCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        {visibleColumns.Equipment && <td className="py-3 px-4 text-right text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{getEquipmentCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        {visibleColumns.Overheads && <td className="py-3 px-4 text-right text-blue-600 dark:text-blue-400 border-l border-indigo-200/50 dark:border-indigo-800/30">{getOverheadsCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        {visibleColumns.Profit && <td className="py-3 px-4 text-right text-purple-600 dark:text-purple-400 border-l border-indigo-200/50 dark:border-indigo-800/30">{getProfitCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        {visibleColumns.VAT && <td className="py-3 px-4 text-right text-foreground border-l border-indigo-200/50 dark:border-indigo-800/30">{getVATCost(item).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
        <td className="py-3 px-4 text-center border-l border-indigo-200/50 dark:border-indigo-800/30">
          <div className="flex items-center justify-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-blue-600 dark:text-blue-400 hover:text-white hover:bg-blue-600 dark:hover:bg-blue-600"
              onClick={handleEdit}
              disabled={isLocked}
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-600"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this item?')) {
                  onDelete(item.id);
                }
              }}
              disabled={isLocked}
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </td>
        <td className="py-3 px-4 border-l border-indigo-200/50 dark:border-indigo-800/30"></td>
      </tr>
      {hasChildren && isExpanded && item.children?.map((child, childIndex) => (
        <EstimateRow 
          key={child.id} 
          item={child} 
          level={level + 1}
          index={`${index}${index ? '.' : ''}${childIndex + 1}`}
          onAddChild={onAddChild}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isLocked={isLocked}
          visibleColumns={visibleColumns}
          isExpanded={isExpanded}
        />
      ))}
    </>
  )
} 