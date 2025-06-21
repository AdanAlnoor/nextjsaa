import * as XLSX from 'xlsx';

export function generateExcelTemplate() {
  // Define the template columns (only essential ones)
  const columns = [
    'name',
    'quantity',
    'unit',
    'rate'
  ];

  // Sample data to help users understand the format
  const sampleData = [
    ['Excavation works (Item 2.1)', '120', 'm3', '450'],
    ['Concrete foundation (Item 2.2)', '85', 'm2', '2800'],
    ['Steel reinforcement (Item 2.3)', '2500', 'kg', '180']
  ];

  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet([
    columns,  // Headers
    ...sampleData  // Sample rows
  ]);

  // Add column widths for better readability
  ws['!cols'] = [
    { wch: 40 },  // name (increased width to accommodate index info)
    { wch: 12 },  // quantity
    { wch: 10 },  // unit
    { wch: 12 }   // rate
  ];

  // Add a comment to the name header explaining the index format
  ws['A1'].c = [{
    a: 'Author',
    t: 'Include the item index in parentheses at the end of the name for better organization. Example: "Item Description (Item 2.1)"'
  }];

  // Create a workbook and add the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, 'Items');

  // Generate the Excel file
  XLSX.writeFile(workbook, 'estimate_items_template.xlsx');
}

export function downloadExcelTemplate() {
  generateExcelTemplate();
} 