import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CostControlData } from '@/components/cost-control/CostControlTab';

// Add the missing type for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Export cost control data to PDF
 */
export const exportToPDF = (item: CostControlData, allItems: CostControlData[]) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(`Cost Control: ${item.name}`, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Prepare data for the table
  let tableData: any[] = [];
  
  // If it's a parent item, include its children
  if (item.isParent && item.children) {
    // Add the parent item
    tableData.push([
      item.name,
      formatAmount(item.boAmount),
      formatAmount(item.actual),
      formatAmount(item.difference),
      formatAmount(item.paidBills),
      formatAmount(item.externalBills),
      formatAmount(item.pendingBills),
      formatAmount(item.wages)
    ]);
    
    // Add children
    item.children.forEach(childId => {
      const childItem = allItems.find(i => i.id === childId);
      if (childItem) {
        tableData.push([
          `  ${childItem.name}`,
          formatAmount(childItem.boAmount),
          formatAmount(childItem.actual),
          formatAmount(childItem.difference),
          formatAmount(childItem.paidBills),
          formatAmount(childItem.externalBills),
          formatAmount(childItem.pendingBills),
          formatAmount(childItem.wages)
        ]);
      }
    });
  } else {
    // Just add the single item
    tableData.push([
      item.name,
      formatAmount(item.boAmount),
      formatAmount(item.actual),
      formatAmount(item.difference),
      formatAmount(item.paidBills),
      formatAmount(item.externalBills),
      formatAmount(item.pendingBills),
      formatAmount(item.wages)
    ]);
  }
  
  // Add the table
  doc.autoTable({
    head: [['Name', 'BO Amount', 'Actual', 'Difference', 'Paid Bills', 'External Bills', 'Pending Bills', 'Wages']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' }
    }
  });
  
  // Save the PDF
  doc.save(`cost-control-${item.name.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

/**
 * Export cost control data to Excel
 */
export const exportToExcel = (item: CostControlData, allItems: CostControlData[]) => {
  // Prepare data for the Excel sheet
  let excelData: any[] = [];
  
  // Add header row
  excelData.push([
    'Name', 
    'BO Amount', 
    'Actual', 
    'Difference', 
    'Paid Bills', 
    'External Bills', 
    'Pending Bills', 
    'Wages'
  ]);
  
  // If it's a parent item, include its children
  if (item.isParent && item.children) {
    // Add the parent item
    excelData.push([
      item.name,
      item.boAmount,
      item.actual,
      item.difference,
      item.paidBills,
      item.externalBills,
      item.pendingBills,
      item.wages
    ]);
    
    // Add children
    item.children.forEach(childId => {
      const childItem = allItems.find(i => i.id === childId);
      if (childItem) {
        excelData.push([
          `  ${childItem.name}`,
          childItem.boAmount,
          childItem.actual,
          childItem.difference,
          childItem.paidBills,
          childItem.externalBills,
          childItem.pendingBills,
          childItem.wages
        ]);
      }
    });
  } else {
    // Just add the single item
    excelData.push([
      item.name,
      item.boAmount,
      item.actual,
      item.difference,
      item.paidBills,
      item.externalBills,
      item.pendingBills,
      item.wages
    ]);
  }
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  
  // Create a workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cost Control');
  
  // Save the Excel file
  XLSX.writeFile(wb, `cost-control-${item.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`);
};

/**
 * Format amount for display
 */
const formatAmount = (value: number | undefined): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'KES 0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(value);
};

/**
 * Export all cost control data to PDF
 */
export const exportAllToPDF = (projectName: string, items: CostControlData[]) => {
  // Create a new PDF document
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(18);
  doc.text(`${projectName} - Cost Control`, 14, 22);
  
  // Add date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Prepare data for the table
  let tableData: any[] = [];
  
  // Add all items
  items.forEach(item => {
    tableData.push([
      item.isParent ? item.name : `  ${item.name}`,
      formatAmount(item.boAmount),
      formatAmount(item.actual),
      formatAmount(item.difference),
      formatAmount(item.paidBills),
      formatAmount(item.externalBills),
      formatAmount(item.pendingBills),
      formatAmount(item.wages)
    ]);
  });
  
  // Add the table
  doc.autoTable({
    head: [['Name', 'BO Amount', 'Actual', 'Difference', 'Paid Bills', 'External Bills', 'Pending Bills', 'Wages']],
    body: tableData,
    startY: 40,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [66, 66, 66] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' }
    }
  });
  
  // Save the PDF
  doc.save(`${projectName.replace(/\s+/g, '-').toLowerCase()}-cost-control.pdf`);
};

/**
 * Export all cost control data to Excel
 */
export const exportAllToExcel = (projectName: string, items: CostControlData[]) => {
  // Prepare data for the Excel sheet
  let excelData: any[] = [];
  
  // Add header row
  excelData.push([
    'Name', 
    'BO Amount', 
    'Actual', 
    'Difference', 
    'Paid Bills', 
    'External Bills', 
    'Pending Bills', 
    'Wages'
  ]);
  
  // Add all items
  items.forEach(item => {
    excelData.push([
      item.isParent ? item.name : `  ${item.name}`,
      item.boAmount,
      item.actual,
      item.difference,
      item.paidBills,
      item.externalBills,
      item.pendingBills,
      item.wages
    ]);
  });
  
  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(excelData);
  
  // Create a workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cost Control');
  
  // Save the Excel file
  XLSX.writeFile(wb, `${projectName.replace(/\s+/g, '-').toLowerCase()}-cost-control.xlsx`);
}; 