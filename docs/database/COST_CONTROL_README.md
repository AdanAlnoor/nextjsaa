# Cost Control Import Feature

This README provides information about the Cost Control import feature, which allows you to import data from the Estimate tab to the Cost Control tab in the application.

## How the Import Works

The import feature transfers Level 0 and Level 1 items from the Estimate tab to the Cost Control tab. Here's what happens during the import:

1. Level 0 items (parent items) from the Estimate are imported as parent items in Cost Control
2. Level 1 items (children of the Level 0 items) are imported as child items under their respective parents
3. The `name` field from the Estimate is used as the `name` in Cost Control
4. The `amount` field from the Estimate is used as the `bo_amount` (Bill of Quantities Amount) in Cost Control
5. All other amount fields (actual_amount, paid_bills, etc.) are initialized to 0
6. Each imported item is marked with `imported_from_estimate = true` and records the import date

## Using the Import Feature

To use the import feature in the application:

1. Navigate to the Estimate tab for a project
2. Click the "Import to Cost Control" button
3. Review the confirmation dialog, which explains what will be imported
4. Click "Import Data" to proceed

After import, you can switch to the Cost Control tab to see the imported items.

## Troubleshooting the Import

If you encounter issues with the import feature, consider the following:

1. **No data appears after import**: Refresh the page or manually click the refresh button on the Cost Control tab
2. **Error during import**: Check the browser console for detailed error messages
3. **Duplicate items**: If you import multiple times, the system will create new items each time 

## Utility Scripts

This project includes several utility scripts to help with testing and troubleshooting the import feature.

### Test Scripts

- `test_fetch_estimate.js`: Tests fetching estimate data from the database
- `test_import_pr003.js`: Tests importing estimate data from project PR-003 to cost control
- `test_complete_import.js`: Comprehensive test of the entire import process

Run these scripts using Node.js:

```bash
node test_fetch_estimate.js
node test_import_pr003.js
node test_complete_import.js
```

### Reset Script

The `reset_cost_control.js` script allows you to reset (delete) all cost control items for a specific project. This is useful if you want to start fresh after testing imports.

```bash
node reset_cost_control.js <project_id>
```

For example:

```bash
node reset_cost_control.js PR-003
```

**Warning**: This will permanently delete all cost control items for the specified project. Use with caution.

## Data Structures

### Estimate Item Structure

```typescript
interface EstimateItem {
  id: string;
  name: string;          
  amount: number;  
  level: number;
  parent_id?: string;
  project_id: string;
}
```