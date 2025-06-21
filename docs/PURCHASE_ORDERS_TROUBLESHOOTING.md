# Purchase Orders Troubleshooting Guide

This guide provides steps to fix issues with viewing or creating purchase orders in the application.

## Quick Fix Steps

1. **Navigate to the correct URL**: Purchase orders are managed at the project level
   - Go to `/projects/[project-id]/cost-control/purchase-works` instead of `/cost-control/purchase-works`

2. **Check database tables**: Run the migration check script
   ```bash
   npx ts-node -r tsconfig-paths/register src/scripts/check-migrations.ts
   ```

3. **Check user permissions**: Make sure your user has the required permissions
   ```bash
   npx ts-node -r tsconfig-paths/register src/scripts/debug-purchase-orders.ts
   ```

4. **Try mock mode**: If the database has issues, enable mock mode to use sample data
   - Click the "Use Demo Mode" button when presented with a database error
   - Or add `?mock=true` to the URL

## Common Issues

### 1. Database Tables Don't Exist

If the database tables for purchase orders don't exist, run:

```bash
npx ts-node -r tsconfig-paths/register src/scripts/check-migrations.ts
```

This will create the necessary tables:
- `purchase_orders`
- `purchase_order_items`

### 2. Permission Issues

If you're getting access denied errors, you need to ensure your user has the proper roles assigned:

1. Go to user management in the admin section
2. Assign one of the following roles to your user:
   - admin
   - project_manager
   - purchaser

Or run SQL to grant permissions:

```sql
INSERT INTO user_roles (user_id, role, project_id)
VALUES ('your-user-id', 'purchaser', 'your-project-id');
```

### 3. UI Not Showing Purchase Orders

If the UI doesn't show the purchase order list:

1. Check the browser console for errors
2. Verify the project ID in the URL is correct
3. Try clearing your browser cache and localStorage
4. Try a different browser to rule out browser-specific issues

### 4. Can't Create Purchase Orders

If you can't create purchase orders:

1. Make sure you have the `create_purchase_order` permission
2. Check if there are form validation errors when submitting
3. Look at the browser console for API errors
4. Try using mock mode to test the creation flow

## Debug Information to Provide When Reporting Issues

When reporting issues with purchase orders, please provide:

1. The URL you're trying to access
2. Any error messages in the browser console
3. Your user role/permissions
4. Output from the debug scripts
5. Screenshots of the issue

## Mock Mode for Testing

If you want to use the application without a working database connection, enable mock mode:

1. Add `?mock=true` to the URL
2. Or click the "Use Demo Mode" button when shown a database error

Mock mode creates sample purchase orders in memory for testing UI functionality.

## Advanced: Database Schema Information

The purchase orders functionality uses these database tables:

```
purchase_orders
├── id (UUID, primary key)
├── po_number (TEXT)
├── name (TEXT)
├── assigned_to (TEXT)
├── description (TEXT, nullable)
├── total (DECIMAL)
├── paid_bills (DECIMAL)
├── due_bills (DECIMAL)
├── status (TEXT: Draft, Pending, Approved)
├── project_id (UUID)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

purchase_order_items
├── id (UUID, primary key)
├── purchase_order_id (UUID)
├── description (TEXT)
├── quantity (DECIMAL)
├── unit (TEXT)
├── price (DECIMAL)
├── unit_cost (DECIMAL)
├── amount (DECIMAL)
├── internal_note (TEXT, nullable)
├── name (TEXT, nullable)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
``` 