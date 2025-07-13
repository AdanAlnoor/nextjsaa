# Purchase Order and Bills System Improvement Guide

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Proposed Improvements](#proposed-improvements)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Technical Implementation Details](#technical-implementation-details)
6. [Database Schema Changes](#database-schema-changes)
7. [UI/UX Improvements](#uiux-improvements)
8. [Integration Guidelines](#integration-guidelines)
9. [Security and Compliance](#security-and-compliance)
10. [Testing Strategy](#testing-strategy)

## Executive Summary

This guide outlines comprehensive improvements to transform the current Purchase Order (PO) and Bills management system into an enterprise-grade solution that follows international construction industry standards. The improvements focus on budget control, workflow automation, compliance, and user experience.

### Key Objectives
- Implement strict budget control linking POs to available funds
- Create a complete procurement-to-payment cycle
- Ensure compliance with international accounting standards
- Improve user efficiency through automation and smart defaults
- Provide comprehensive audit trails and reporting

## Current System Analysis

### Strengths
1. **Real-time Updates**: WebSocket-based live updates for POs
2. **Cost Control Integration**: Database structure supports linking to budget items
3. **Payment Tracking**: Bills system tracks partial payments
4. **Role-Based Access**: Comprehensive permission system

### Weaknesses
1. **No Budget Validation**: POs can exceed available budget
2. **Manual Item Entry**: No catalog or historical data
3. **Missing UI Features**: No edit functionality for POs
4. **Incomplete Integration**: Cost control links not implemented in UI
5. **Limited Reporting**: No analytics or budget variance reports
6. **No Tax Handling**: Missing VAT/GST calculations
7. **No Multi-Currency**: Single currency assumption

## Proposed Improvements

### 1. Budget-Driven Purchase Orders

#### 1.1 Cost Control Item Selection
Transform PO creation from free-form to budget-driven:

```typescript
interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  cost_control_item_id: string; // Required, not optional
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  amount: number;
  // New fields
  budget_available: number;
  budget_committed: number;
  catalog_item_id?: string;
}
```

#### 1.2 Budget Validation Rules
- **Hard Stop**: Prevent PO creation if amount exceeds available budget
- **Warning Threshold**: Alert at 80% budget consumption
- **Approval Escalation**: Require higher approval for budget exceptions

#### 1.3 Implementation Steps
1. Modify PO creation UI to require cost control item selection
2. Add real-time budget availability display
3. Implement validation in both frontend and backend
4. Create approval workflow for budget exceptions

### 2. Item Catalog System

#### 2.1 Master Item Catalog
Create a centralized catalog for commonly purchased items:

```sql
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES item_categories(id),
  default_unit VARCHAR(50),
  default_supplier_id UUID REFERENCES suppliers(id),
  last_purchase_price DECIMAL(10,2),
  average_price DECIMAL(10,2),
  min_order_quantity DECIMAL(10,2),
  lead_time_days INTEGER,
  specifications JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES item_categories(id),
  cost_control_category VARCHAR(100), -- Links to cost control types
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE supplier_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  catalog_item_id UUID REFERENCES catalog_items(id),
  supplier_item_code VARCHAR(100),
  supplier_item_name VARCHAR(255),
  unit_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  minimum_quantity DECIMAL(10,2),
  lead_time_days INTEGER,
  last_updated DATE,
  is_preferred BOOLEAN DEFAULT false,
  UNIQUE(supplier_id, catalog_item_id)
);
```

#### 2.2 Catalog Features
- **Smart Search**: Type-ahead search with fuzzy matching
- **Price History**: Track historical prices by supplier
- **Specifications**: Store technical specs in structured format
- **Auto-complete**: Fill PO items from catalog selection
- **Supplier Preferences**: Default to preferred suppliers

### 3. Enhanced Budget Tracking

#### 3.1 Three-Way Budget Monitoring
Implement comprehensive budget tracking:

```sql
-- Add to cost_control_items table
ALTER TABLE cost_control_items ADD COLUMN IF NOT EXISTS committed_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE cost_control_items ADD COLUMN IF NOT EXISTS encumbered_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE cost_control_items ADD COLUMN IF NOT EXISTS forecast_amount DECIMAL(12,2);
ALTER TABLE cost_control_items ADD COLUMN IF NOT EXISTS variance_amount DECIMAL(12,2) GENERATED ALWAYS AS (budget_amount - forecast_amount) STORED;

-- Create budget tracking view
CREATE OR REPLACE VIEW budget_status AS
SELECT 
  cc.id,
  cc.name,
  cc.item_number,
  cc.budget_amount,
  cc.committed_amount,
  cc.actual_amount,
  cc.pending_bills,
  cc.paid_bills,
  (cc.budget_amount - cc.committed_amount) as available_amount,
  (cc.committed_amount + cc.pending_bills) as total_commitment,
  CASE 
    WHEN cc.budget_amount > 0 THEN 
      ((cc.committed_amount + cc.actual_amount) / cc.budget_amount * 100)
    ELSE 0 
  END as consumption_percentage,
  CASE
    WHEN (cc.budget_amount - cc.committed_amount - cc.actual_amount) < 0 THEN 'Over Budget'
    WHEN ((cc.committed_amount + cc.actual_amount) / NULLIF(cc.budget_amount, 0) * 100) > 90 THEN 'Critical'
    WHEN ((cc.committed_amount + cc.actual_amount) / NULLIF(cc.budget_amount, 0) * 100) > 75 THEN 'Warning'
    ELSE 'Good'
  END as budget_status
FROM cost_control_items cc
WHERE cc.is_parent = false;
```

#### 3.2 Automatic Budget Updates
Create triggers to maintain budget integrity:

```sql
-- Trigger to update committed amount when PO is approved
CREATE OR REPLACE FUNCTION update_committed_on_po_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
    -- Update committed amount for all linked cost control items
    UPDATE cost_control_items
    SET committed_amount = committed_amount + poi.amount
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
    AND poi.cost_control_item_id = cost_control_items.id;
  ELSIF NEW.status != 'Approved' AND OLD.status = 'Approved' THEN
    -- Reverse committed amount if PO is cancelled
    UPDATE cost_control_items
    SET committed_amount = committed_amount - poi.amount
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
    AND poi.cost_control_item_id = cost_control_items.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER po_approval_budget_update
AFTER UPDATE ON purchase_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_committed_on_po_approval();
```

### 4. Approval Workflow Enhancement

#### 4.1 Multi-Level Approval Matrix
Implement approval chains based on amount and type:

```sql
CREATE TABLE approval_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  document_type VARCHAR(50) NOT NULL, -- 'purchase_order', 'bill', 'payment'
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2),
  approval_sequence JSONB NOT NULL, -- Array of approval steps
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example approval_sequence structure:
-- [
--   {
--     "level": 1,
--     "role": "project_manager",
--     "users": ["user_id_1", "user_id_2"], -- specific users or role
--     "type": "any", -- any, all, specific
--     "timeout_hours": 24
--   },
--   {
--     "level": 2,
--     "role": "finance_manager",
--     "type": "any",
--     "timeout_hours": 48
--   }
-- ]

CREATE TABLE approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type VARCHAR(50) NOT NULL,
  document_id UUID NOT NULL,
  approval_level INTEGER NOT NULL,
  approver_id UUID REFERENCES auth.users(id),
  action VARCHAR(20) NOT NULL, -- 'approved', 'rejected', 'delegated'
  comments TEXT,
  delegated_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.2 Approval Features
- **Delegation**: Allow temporary delegation of approval authority
- **Bulk Approval**: Approve multiple POs at once
- **Mobile Approval**: Email/SMS links for quick approval
- **Escalation**: Auto-escalate if not approved within timeframe

### 5. Three-Way Matching

#### 5.1 Receipt Management
Add goods receipt functionality:

```sql
CREATE TABLE goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id),
  received_date DATE NOT NULL,
  received_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id UUID REFERENCES goods_receipts(id),
  purchase_order_item_id UUID REFERENCES purchase_order_items(id),
  quantity_received DECIMAL(10,2) NOT NULL,
  quantity_accepted DECIMAL(10,2) NOT NULL,
  quantity_rejected DECIMAL(10,2) DEFAULT 0,
  rejection_reason TEXT,
  storage_location VARCHAR(100),
  batch_number VARCHAR(50),
  expiry_date DATE
);
```

#### 5.2 Matching Process
Implement automatic three-way matching:

```sql
CREATE OR REPLACE FUNCTION perform_three_way_match(
  p_bill_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_match_result JSONB;
  v_po_total DECIMAL;
  v_gr_total DECIMAL;
  v_bill_total DECIMAL;
  v_tolerance_percent DECIMAL := 5; -- 5% tolerance
BEGIN
  -- Get totals from PO, GR, and Bill
  SELECT 
    po.total,
    COALESCE(SUM(gri.quantity_accepted * poi.unit_cost), 0),
    b.amount
  INTO v_po_total, v_gr_total, v_bill_total
  FROM bills b
  JOIN purchase_orders po ON b.purchase_order_id = po.id
  LEFT JOIN goods_receipts gr ON gr.purchase_order_id = po.id
  LEFT JOIN goods_receipt_items gri ON gri.goods_receipt_id = gr.id
  LEFT JOIN purchase_order_items poi ON gri.purchase_order_item_id = poi.id
  WHERE b.id = p_bill_id
  GROUP BY po.total, b.amount;

  -- Perform matching logic
  v_match_result := jsonb_build_object(
    'po_amount', v_po_total,
    'received_amount', v_gr_total,
    'bill_amount', v_bill_total,
    'po_bill_match', ABS(v_po_total - v_bill_total) <= (v_po_total * v_tolerance_percent / 100),
    'gr_bill_match', ABS(v_gr_total - v_bill_total) <= (v_gr_total * v_tolerance_percent / 100),
    'three_way_match', 
      ABS(v_po_total - v_bill_total) <= (v_po_total * v_tolerance_percent / 100) AND
      ABS(v_gr_total - v_bill_total) <= (v_gr_total * v_tolerance_percent / 100),
    'variance_amount', v_bill_total - v_gr_total,
    'variance_percent', 
      CASE WHEN v_gr_total > 0 
        THEN ((v_bill_total - v_gr_total) / v_gr_total * 100)
        ELSE 0 
      END
  );

  RETURN v_match_result;
END;
$$ LANGUAGE plpgsql;
```

### 6. Tax and Multi-Currency Support

#### 6.1 Tax Management
Implement comprehensive tax handling:

```sql
CREATE TABLE tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  rate DECIMAL(5,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'VAT', 'GST', 'Sales Tax'
  country VARCHAR(2),
  is_compound BOOLEAN DEFAULT false,
  is_recoverable BOOLEAN DEFAULT true,
  gl_account_code VARCHAR(50),
  effective_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add tax fields to PO and Bill items
ALTER TABLE purchase_order_items 
ADD COLUMN tax_code_id UUID REFERENCES tax_codes(id),
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + tax_amount) STORED;

ALTER TABLE bill_items
ADD COLUMN tax_code_id UUID REFERENCES tax_codes(id),
ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + tax_amount) STORED;
```

#### 6.2 Multi-Currency Support
Add currency handling:

```sql
CREATE TABLE currencies (
  code VARCHAR(3) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(5),
  decimal_places INTEGER DEFAULT 2,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) REFERENCES currencies(code),
  to_currency VARCHAR(3) REFERENCES currencies(code),
  rate DECIMAL(12,6) NOT NULL,
  effective_date DATE NOT NULL,
  source VARCHAR(50), -- 'Manual', 'API', 'Bank'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- Add currency fields
ALTER TABLE purchase_orders
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN exchange_rate DECIMAL(12,6) DEFAULT 1,
ADD COLUMN base_total DECIMAL(12,2); -- Total in base currency

ALTER TABLE bills
ADD COLUMN currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN exchange_rate DECIMAL(12,6) DEFAULT 1,
ADD COLUMN base_amount DECIMAL(12,2);
```

### 7. Document Management

#### 7.1 Enhanced Attachment System
Improve document handling:

```sql
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'purchase_order', 'bill', 'receipt'
  template_content TEXT, -- HTML/Markdown template
  variables JSONB, -- Available merge fields
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE purchase_orders
ADD COLUMN documents JSONB DEFAULT '[]'::jsonb;
-- Structure: [{"type": "contract", "url": "...", "uploaded_at": "..."}]

ALTER TABLE bills
ADD COLUMN ocr_data JSONB, -- Extracted data from scanned bills
ADD COLUMN ocr_confidence DECIMAL(3,2), -- OCR accuracy score
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'Pending';
```

#### 7.2 OCR Integration
Implement bill scanning:

```typescript
interface OCRService {
  scanDocument(file: File): Promise<OCRResult>;
  extractBillData(ocrResult: OCRResult): BillData;
  validateExtractedData(data: BillData): ValidationResult;
}

interface OCRResult {
  text: string;
  confidence: number;
  extractedFields: {
    billNumber?: string;
    supplierName?: string;
    date?: string;
    amount?: number;
    taxAmount?: number;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}
```

### 8. Reporting and Analytics

#### 8.1 Standard Reports
Create essential procurement reports:

```sql
-- Supplier Performance View
CREATE OR REPLACE VIEW supplier_performance AS
SELECT 
  s.id,
  s.name,
  COUNT(DISTINCT po.id) as total_pos,
  COUNT(DISTINCT b.id) as total_bills,
  SUM(po.total) as total_po_value,
  AVG(
    EXTRACT(DAY FROM b.created_at - po.created_at)
  ) as avg_delivery_days,
  COUNT(DISTINCT CASE WHEN b.due_date < CURRENT_DATE AND b.status != 'Paid' THEN b.id END) as overdue_bills,
  AVG(
    CASE WHEN po.total > 0 
      THEN ((b.amount - po.total) / po.total * 100) 
      ELSE 0 
    END
  ) as avg_price_variance
FROM suppliers s
LEFT JOIN purchase_orders po ON po.supplier_id = s.id
LEFT JOIN bills b ON b.supplier_id = s.id
GROUP BY s.id, s.name;

-- Budget Variance Report
CREATE OR REPLACE VIEW budget_variance_report AS
SELECT 
  p.project_number,
  p.project_name,
  cc.item_number,
  cc.name as item_name,
  cc.budget_amount,
  cc.committed_amount,
  cc.actual_amount,
  (cc.committed_amount + cc.actual_amount) as total_cost,
  (cc.budget_amount - cc.committed_amount - cc.actual_amount) as variance,
  CASE 
    WHEN cc.budget_amount > 0 
      THEN ((cc.budget_amount - cc.committed_amount - cc.actual_amount) / cc.budget_amount * 100)
    ELSE 0 
  END as variance_percent
FROM cost_control_items cc
JOIN projects p ON cc.project_id = p.id
WHERE cc.is_parent = false
ORDER BY p.project_number, cc.item_number;
```

#### 8.2 Dashboard Widgets
Key performance indicators:

```typescript
interface ProcurementDashboard {
  // KPI Widgets
  totalPOsThisMonth: number;
  totalSpendThisMonth: number;
  pendingApprovals: number;
  overduePayments: number;
  budgetUtilization: number; // percentage
  
  // Charts
  spendByCategory: ChartData;
  spendBySupplier: ChartData;
  monthlySpendTrend: ChartData;
  budgetVsActual: ChartData;
  
  // Alerts
  budgetAlerts: Alert[];
  approvalAlerts: Alert[];
  paymentAlerts: Alert[];
}
```

### 9. Automation and Workflows

#### 9.1 Automated Processes
Implement smart automation:

```sql
-- Auto-create recurring POs
CREATE TABLE recurring_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_data JSONB NOT NULL, -- PO template
  frequency VARCHAR(20) NOT NULL, -- 'weekly', 'monthly', 'quarterly'
  next_creation_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Automated payment scheduling
CREATE TABLE payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID REFERENCES bills(id),
  scheduled_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  is_processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 9.2 Notification System
Comprehensive alerts:

```typescript
interface NotificationRules {
  // PO Notifications
  poApprovalRequired: boolean;
  poApproved: boolean;
  poRejected: boolean;
  poBudgetExceeded: boolean;
  
  // Bill Notifications
  billReceived: boolean;
  billDueSoon: boolean; // X days before due
  billOverdue: boolean;
  paymentProcessed: boolean;
  
  // Budget Notifications
  budgetThreshold75: boolean;
  budgetThreshold90: boolean;
  budgetExceeded: boolean;
  
  // Delivery
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
}
```

### 10. Integration APIs

#### 10.1 RESTful API Design
Standard API endpoints:

```typescript
// Purchase Orders API
POST   /api/v1/purchase-orders
GET    /api/v1/purchase-orders
GET    /api/v1/purchase-orders/:id
PUT    /api/v1/purchase-orders/:id
DELETE /api/v1/purchase-orders/:id
POST   /api/v1/purchase-orders/:id/approve
POST   /api/v1/purchase-orders/:id/reject
POST   /api/v1/purchase-orders/:id/convert-to-bill

// Bills API
POST   /api/v1/bills
GET    /api/v1/bills
GET    /api/v1/bills/:id
PUT    /api/v1/bills/:id
DELETE /api/v1/bills/:id
POST   /api/v1/bills/:id/payments
GET    /api/v1/bills/:id/payments
POST   /api/v1/bills/:id/attachments

// Catalog API
GET    /api/v1/catalog/items
GET    /api/v1/catalog/items/:id
POST   /api/v1/catalog/items
PUT    /api/v1/catalog/items/:id
GET    /api/v1/catalog/categories
GET    /api/v1/catalog/search

// Reports API
GET    /api/v1/reports/budget-variance
GET    /api/v1/reports/supplier-performance
GET    /api/v1/reports/spend-analysis
GET    /api/v1/reports/aging
```

#### 10.2 Webhooks
Event-driven integrations:

```typescript
interface WebhookEvents {
  'po.created': PurchaseOrder;
  'po.approved': PurchaseOrder;
  'po.rejected': PurchaseOrder;
  'bill.created': Bill;
  'bill.paid': Bill;
  'payment.processed': Payment;
  'budget.exceeded': BudgetAlert;
}

// Webhook configuration
interface WebhookConfig {
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  headers?: Record<string, string>;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}
```

## Implementation Roadmap

### Phase 1: Core Improvements (Weeks 1-4)
1. **Week 1-2**: Implement cost control item selection in PO creation
2. **Week 2-3**: Add budget validation and committed amount tracking
3. **Week 3-4**: Create basic item catalog functionality

### Phase 2: Advanced Features (Weeks 5-8)
1. **Week 5-6**: Implement three-way matching and goods receipts
2. **Week 6-7**: Add tax management and multi-currency support
3. **Week 7-8**: Enhance approval workflows with matrix-based routing

### Phase 3: Automation & Reporting (Weeks 9-12)
1. **Week 9-10**: Build reporting views and dashboards
2. **Week 10-11**: Implement OCR and document management
3. **Week 11-12**: Add automation features and notifications

### Phase 4: Integration & Polish (Weeks 13-16)
1. **Week 13-14**: Develop REST APIs and webhooks
2. **Week 14-15**: Integrate with external systems
3. **Week 15-16**: Performance optimization and testing

## Technical Implementation Details

### Frontend Components

#### 1. Enhanced PO Creation Dialog
```tsx
// components/cost-control/purchase-orders/CreatePurchaseOrderDialog.tsx
interface CreatePurchaseOrderDialogProps {
  projectId: string;
  costControlItems: CostControlItem[];
  onClose: () => void;
  onSuccess: (po: PurchaseOrder) => void;
}

const CreatePurchaseOrderDialog: React.FC<CreatePurchaseOrderDialogProps> = ({
  projectId,
  costControlItems,
  onClose,
  onSuccess
}) => {
  const [items, setItems] = useState<POItemForm[]>([]);
  const [selectedCostControl, setSelectedCostControl] = useState<string>('');
  const [showCatalog, setShowCatalog] = useState(false);

  // Budget validation
  const validateBudget = (costControlId: string, amount: number) => {
    const costItem = costControlItems.find(cc => cc.id === costControlId);
    if (!costItem) return { valid: false, message: 'Invalid budget item' };
    
    const available = costItem.budget_amount - costItem.committed_amount - costItem.actual_amount;
    if (amount > available) {
      return { 
        valid: false, 
        message: `Exceeds available budget by ${formatCurrency(amount - available)}` 
      };
    }
    
    if (amount > available * 0.8) {
      return { 
        valid: true, 
        warning: `Using ${Math.round(amount / available * 100)}% of available budget` 
      };
    }
    
    return { valid: true };
  };

  // Catalog item selection
  const selectFromCatalog = async (catalogItem: CatalogItem) => {
    const newItem: POItemForm = {
      catalog_item_id: catalogItem.id,
      description: catalogItem.name,
      quantity: catalogItem.min_order_quantity || 1,
      unit: catalogItem.default_unit,
      unit_cost: catalogItem.last_purchase_price || 0,
      cost_control_item_id: selectedCostControl,
      specifications: catalogItem.specifications
    };
    
    setItems([...items, newItem]);
    setShowCatalog(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>
        
        <Form onSubmit={handleSubmit}>
          {/* PO Header Fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              name="po_number"
              label="PO Number"
              value={generatePONumber()}
              disabled
            />
            <FormField
              name="supplier_id"
              label="Supplier"
              type="select"
              options={suppliers}
              required
            />
          </div>

          {/* PO Items Section */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCatalog(true)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Select from Catalog
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBlankItem}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom Item
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cost Control Item</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Budget Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <POItemRow
                    key={index}
                    item={item}
                    costControlItems={costControlItems}
                    onUpdate={(updated) => updateItem(index, updated)}
                    onRemove={() => removeItem(index)}
                    validateBudget={validateBudget}
                  />
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Total</TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(calculateTotal(items))}
                  </TableCell>
                  <TableCell>
                    <BudgetSummary items={items} costControlItems={costControlItems} />
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          {/* Action Buttons */}
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Create Purchase Order
            </Button>
          </DialogFooter>
        </Form>

        {/* Catalog Modal */}
        {showCatalog && (
          <CatalogSelectionModal
            open={showCatalog}
            onClose={() => setShowCatalog(false)}
            onSelect={selectFromCatalog}
            costControlCategory={getSelectedCategory()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
```

#### 2. Budget Status Component
```tsx
// components/cost-control/BudgetStatusIndicator.tsx
interface BudgetStatusIndicatorProps {
  costControlItem: CostControlItem;
  additionalCommitment?: number;
}

const BudgetStatusIndicator: React.FC<BudgetStatusIndicatorProps> = ({
  costControlItem,
  additionalCommitment = 0
}) => {
  const budget = costControlItem.budget_amount;
  const committed = costControlItem.committed_amount;
  const actual = costControlItem.actual_amount;
  const pending = costControlItem.pending_bills;
  
  const used = committed + actual + additionalCommitment;
  const available = budget - used;
  const percentUsed = (used / budget) * 100;
  
  const getStatusColor = () => {
    if (percentUsed >= 100) return 'bg-red-500';
    if (percentUsed >= 90) return 'bg-orange-500';
    if (percentUsed >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Budget</span>
        <span className="font-medium">{formatCurrency(budget)}</span>
      </div>
      
      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute left-0 top-0 h-full transition-all ${getStatusColor()}`}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Committed:</span>
          <span className="ml-1 font-medium">{formatCurrency(committed)}</span>
        </div>
        <div>
          <span className="text-gray-500">Actual:</span>
          <span className="ml-1 font-medium">{formatCurrency(actual)}</span>
        </div>
        <div>
          <span className="text-gray-500">Pending:</span>
          <span className="ml-1 font-medium">{formatCurrency(pending)}</span>
        </div>
        <div>
          <span className="text-gray-500">Available:</span>
          <span className={`ml-1 font-medium ${available < 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(available)}
          </span>
        </div>
      </div>
      
      {additionalCommitment > 0 && (
        <div className="text-xs text-orange-600 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Additional commitment: {formatCurrency(additionalCommitment)}
        </div>
      )}
    </div>
  );
};
```

#### 3. Three-Way Match Component
```tsx
// components/bills/ThreeWayMatchStatus.tsx
interface ThreeWayMatchStatusProps {
  bill: Bill;
  purchaseOrder: PurchaseOrder;
  goodsReceipts: GoodsReceipt[];
}

const ThreeWayMatchStatus: React.FC<ThreeWayMatchStatusProps> = ({
  bill,
  purchaseOrder,
  goodsReceipts
}) => {
  const [matchResult, setMatchResult] = useState<ThreeWayMatchResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performMatch();
  }, [bill.id]);

  const performMatch = async () => {
    try {
      const result = await api.bills.performThreeWayMatch(bill.id);
      setMatchResult(result);
    } catch (error) {
      console.error('Failed to perform three-way match:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-32" />;
  if (!matchResult) return null;

  const getMatchIcon = (matched: boolean) => {
    return matched ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Three-Way Match Status
          {matchResult.three_way_match ? (
            <Badge variant="success">Matched</Badge>
          ) : (
            <Badge variant="destructive">Mismatch</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* PO vs Bill Match */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getMatchIcon(matchResult.po_bill_match)}
              <span>Purchase Order vs Bill</span>
            </div>
            <div className="text-sm text-gray-600">
              PO: {formatCurrency(matchResult.po_amount)} | 
              Bill: {formatCurrency(matchResult.bill_amount)}
            </div>
          </div>

          {/* GR vs Bill Match */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getMatchIcon(matchResult.gr_bill_match)}
              <span>Goods Receipt vs Bill</span>
            </div>
            <div className="text-sm text-gray-600">
              Received: {formatCurrency(matchResult.received_amount)} | 
              Bill: {formatCurrency(matchResult.bill_amount)}
            </div>
          </div>

          {/* Variance Details */}
          {!matchResult.three_way_match && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Variance Detected</AlertTitle>
              <AlertDescription>
                Amount variance: {formatCurrency(Math.abs(matchResult.variance_amount))} 
                ({matchResult.variance_percent.toFixed(2)}%)
                {matchResult.variance_percent > 5 && (
                  <p className="mt-2">
                    Variance exceeds acceptable tolerance of 5%. 
                    Manual review required.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            {!matchResult.three_way_match && (
              <>
                <Button variant="outline" size="sm">
                  Request Review
                </Button>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </>
            )}
            {matchResult.three_way_match && (
              <Button variant="default" size="sm">
                Approve for Payment
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### Backend Services

#### 1. Budget Service
```typescript
// services/budgetService.ts
export class BudgetService {
  /**
   * Validates if a purchase order can be created within budget constraints
   */
  async validatePurchaseOrder(
    items: PurchaseOrderItem[],
    projectId: string
  ): Promise<BudgetValidationResult> {
    const validationResults: ItemValidationResult[] = [];
    let totalExcess = 0;
    let hasErrors = false;

    for (const item of items) {
      const costControlItem = await this.getCostControlItem(item.cost_control_item_id);
      
      if (!costControlItem) {
        validationResults.push({
          itemId: item.id,
          valid: false,
          error: 'Cost control item not found'
        });
        hasErrors = true;
        continue;
      }

      const available = this.calculateAvailableBudget(costControlItem);
      const isValid = item.amount <= available;
      
      if (!isValid) {
        totalExcess += item.amount - available;
        hasErrors = true;
      }

      validationResults.push({
        itemId: item.id,
        valid: isValid,
        available,
        requested: item.amount,
        excess: isValid ? 0 : item.amount - available,
        percentageUsed: (item.amount / costControlItem.budget_amount) * 100
      });
    }

    return {
      valid: !hasErrors,
      items: validationResults,
      totalExcess,
      requiresApproval: totalExcess > 0
    };
  }

  /**
   * Updates committed amounts when PO is approved
   */
  async commitBudget(purchaseOrderId: string): Promise<void> {
    const { data: poItems, error } = await supabase
      .from('purchase_order_items')
      .select('*, cost_control_item_id')
      .eq('purchase_order_id', purchaseOrderId);

    if (error) throw error;

    // Group by cost control item to batch updates
    const updates = new Map<string, number>();
    
    for (const item of poItems) {
      if (item.cost_control_item_id) {
        const current = updates.get(item.cost_control_item_id) || 0;
        updates.set(item.cost_control_item_id, current + item.amount);
      }
    }

    // Perform batch update
    const updatePromises = Array.from(updates.entries()).map(
      async ([costControlId, amount]) => {
        return supabase
          .from('cost_control_items')
          .update({
            committed_amount: sql`committed_amount + ${amount}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', costControlId);
      }
    );

    await Promise.all(updatePromises);
    
    // Update parent items
    await this.updateParentBudgets(Array.from(updates.keys()));
  }

  /**
   * Releases committed budget when PO is cancelled
   */
  async releaseBudget(purchaseOrderId: string): Promise<void> {
    // Similar to commitBudget but subtracts amounts
    // Implementation follows same pattern
  }

  private calculateAvailableBudget(item: CostControlItem): number {
    return item.budget_amount - item.committed_amount - item.actual_amount;
  }

  private async updateParentBudgets(costControlIds: string[]): Promise<void> {
    // Get all affected parent IDs
    const { data: items } = await supabase
      .from('cost_control_items')
      .select('parent_id')
      .in('id', costControlIds)
      .not('parent_id', 'is', null);

    const parentIds = [...new Set(items?.map(i => i.parent_id))];

    // Recalculate parent totals
    for (const parentId of parentIds) {
      await this.recalculateParentTotals(parentId);
    }
  }

  private async recalculateParentTotals(parentId: string): Promise<void> {
    const { data: children } = await supabase
      .from('cost_control_items')
      .select('*')
      .eq('parent_id', parentId);

    if (!children || children.length === 0) return;

    const totals = children.reduce((acc, child) => ({
      budget: acc.budget + (child.budget_amount || 0),
      committed: acc.committed + (child.committed_amount || 0),
      actual: acc.actual + (child.actual_amount || 0),
      pending: acc.pending + (child.pending_bills || 0),
      paid: acc.paid + (child.paid_bills || 0)
    }), {
      budget: 0,
      committed: 0,
      actual: 0,
      pending: 0,
      paid: 0
    });

    await supabase
      .from('cost_control_items')
      .update({
        budget_amount: totals.budget,
        committed_amount: totals.committed,
        actual_amount: totals.actual,
        pending_bills: totals.pending,
        paid_bills: totals.paid,
        updated_at: new Date().toISOString()
      })
      .eq('id', parentId);
  }
}
```

#### 2. Catalog Service
```typescript
// services/catalogService.ts
export class CatalogService {
  /**
   * Search catalog items with intelligent filtering
   */
  async searchItems(params: {
    query?: string;
    categoryId?: string;
    supplierId?: string;
    costControlCategory?: string;
    limit?: number;
  }): Promise<CatalogSearchResult> {
    let query = supabase
      .from('catalog_items')
      .select(`
        *,
        category:item_categories(id, name),
        supplier_items:supplier_catalog_items(
          supplier_id,
          supplier:suppliers(id, name),
          unit_price,
          lead_time_days,
          is_preferred
        )
      `)
      .eq('is_active', true);

    // Apply filters
    if (params.query) {
      query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%,code.ilike.%${params.query}%`);
    }

    if (params.categoryId) {
      query = query.eq('category_id', params.categoryId);
    }

    if (params.costControlCategory) {
      query = query.eq('category.cost_control_category', params.costControlCategory);
    }

    if (params.supplierId) {
      query = query.contains('supplier_items', [{ supplier_id: params.supplierId }]);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Enhance with price analytics
    const enhancedItems = await this.enhanceWithPriceData(data);

    return {
      items: enhancedItems,
      totalCount: count || 0
    };
  }

  /**
   * Get price history for an item
   */
  async getPriceHistory(
    catalogItemId: string,
    supplierId?: string
  ): Promise<PriceHistory[]> {
    const query = supabase
      .from('purchase_order_items')
      .select(`
        unit_cost,
        created_at,
        purchase_order:purchase_orders(
          supplier_id,
          supplier:suppliers(name)
        )
      `)
      .eq('catalog_item_id', catalogItemId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (supplierId) {
      query.eq('purchase_order.supplier_id', supplierId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data.map(item => ({
      price: item.unit_cost,
      date: item.created_at,
      supplier: item.purchase_order.supplier.name
    }));
  }

  /**
   * Update catalog prices based on recent purchases
   */
  async updatePricesFromPurchases(): Promise<void> {
    // Get recent purchase data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentPurchases } = await supabase
      .from('purchase_order_items')
      .select(`
        catalog_item_id,
        unit_cost,
        purchase_order:purchase_orders(supplier_id)
      `)
      .not('catalog_item_id', 'is', null)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .eq('purchase_order.status', 'Approved');

    if (!recentPurchases || recentPurchases.length === 0) return;

    // Calculate average prices by item and supplier
    const priceMap = new Map<string, number[]>();
    const supplierPriceMap = new Map<string, number[]>();

    recentPurchases.forEach(purchase => {
      const itemKey = purchase.catalog_item_id;
      const supplierKey = `${purchase.catalog_item_id}-${purchase.purchase_order.supplier_id}`;

      // Overall average
      if (!priceMap.has(itemKey)) {
        priceMap.set(itemKey, []);
      }
      priceMap.get(itemKey)!.push(purchase.unit_cost);

      // Supplier-specific average
      if (!supplierPriceMap.has(supplierKey)) {
        supplierPriceMap.set(supplierKey, []);
      }
      supplierPriceMap.get(supplierKey)!.push(purchase.unit_cost);
    });

    // Update catalog items with new average prices
    const updates: Promise<any>[] = [];

    // Update overall averages
    priceMap.forEach((prices, catalogItemId) => {
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;
      const lastPrice = prices[prices.length - 1];

      updates.push(
        supabase
          .from('catalog_items')
          .update({
            average_price: average,
            last_purchase_price: lastPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', catalogItemId)
      );
    });

    // Update supplier-specific prices
    supplierPriceMap.forEach((prices, key) => {
      const [catalogItemId, supplierId] = key.split('-');
      const average = prices.reduce((a, b) => a + b, 0) / prices.length;

      updates.push(
        supabase
          .from('supplier_catalog_items')
          .update({
            unit_price: average,
            last_updated: new Date().toISOString()
          })
          .eq('catalog_item_id', catalogItemId)
          .eq('supplier_id', supplierId)
      );
    });

    await Promise.all(updates);
  }

  private async enhanceWithPriceData(items: any[]): Promise<any[]> {
    return items.map(item => {
      // Find best price among suppliers
      const supplierPrices = item.supplier_items || [];
      const bestPrice = supplierPrices.reduce((best: any, current: any) => {
        if (!best || current.unit_price < best.unit_price) {
          return current;
        }
        return best;
      }, null);

      // Calculate price variance
      const priceVariance = supplierPrices.length > 1
        ? this.calculatePriceVariance(supplierPrices)
        : 0;

      return {
        ...item,
        bestPrice: bestPrice?.unit_price,
        bestSupplier: bestPrice?.supplier,
        priceVariance,
        preferredSupplier: supplierPrices.find((s: any) => s.is_preferred)?.supplier
      };
    });
  }

  private calculatePriceVariance(supplierPrices: any[]): number {
    const prices = supplierPrices.map(sp => sp.unit_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return ((max - min) / min) * 100;
  }
}
```

#### 3. Approval Service
```typescript
// services/approvalService.ts
export class ApprovalService {
  /**
   * Route document for approval based on matrix
   */
  async routeForApproval(
    documentType: 'purchase_order' | 'bill' | 'payment',
    documentId: string,
    amount: number,
    projectId: string
  ): Promise<ApprovalRequest> {
    // Get applicable approval matrix
    const matrix = await this.getApprovalMatrix(
      documentType,
      amount,
      projectId
    );

    if (!matrix) {
      throw new Error('No approval matrix defined for this document type and amount');
    }

    // Create approval request
    const approvalRequest = await this.createApprovalRequest({
      document_type: documentType,
      document_id: documentId,
      matrix_id: matrix.id,
      current_level: 1,
      status: 'pending',
      created_at: new Date().toISOString()
    });

    // Notify first level approvers
    await this.notifyApprovers(approvalRequest, 1);

    return approvalRequest;
  }

  /**
   * Process approval action
   */
  async processApproval(
    approvalRequestId: string,
    approverId: string,
    action: 'approve' | 'reject',
    comments?: string
  ): Promise<void> {
    const request = await this.getApprovalRequest(approvalRequestId);
    const matrix = await this.getMatrix(request.matrix_id);
    
    // Validate approver
    const canApprove = await this.validateApprover(
      approverId,
      request,
      matrix
    );

    if (!canApprove) {
      throw new Error('User not authorized to approve at this level');
    }

    // Record approval action
    await this.recordApprovalAction({
      approval_request_id: approvalRequestId,
      approval_level: request.current_level,
      approver_id: approverId,
      action,
      comments,
      created_at: new Date().toISOString()
    });

    if (action === 'approve') {
      // Check if more levels needed
      const nextLevel = request.current_level + 1;
      const hasNextLevel = matrix.approval_sequence.some(
        (level: any) => level.level === nextLevel
      );

      if (hasNextLevel) {
        // Move to next level
        await this.updateApprovalRequest(approvalRequestId, {
          current_level: nextLevel,
          updated_at: new Date().toISOString()
        });

        await this.notifyApprovers(request, nextLevel);
      } else {
        // All levels approved - complete the approval
        await this.completeApproval(request);
      }
    } else {
      // Rejection - update request and document
      await this.rejectDocument(request, comments || 'Rejected by approver');
    }
  }

  /**
   * Handle approval delegation
   */
  async delegateApproval(
    approvalRequestId: string,
    fromUserId: string,
    toUserId: string,
    reason: string
  ): Promise<void> {
    const request = await this.getApprovalRequest(approvalRequestId);
    
    // Validate delegation is allowed
    const canDelegate = await this.validateDelegation(
      fromUserId,
      toUserId,
      request
    );

    if (!canDelegate) {
      throw new Error('Delegation not allowed');
    }

    // Record delegation
    await this.recordApprovalAction({
      approval_request_id: approvalRequestId,
      approval_level: request.current_level,
      approver_id: fromUserId,
      action: 'delegated',
      delegated_to: toUserId,
      comments: reason,
      created_at: new Date().toISOString()
    });

    // Notify delegated approver
    await this.notifyDelegatedApprover(toUserId, request, fromUserId);
  }

  /**
   * Auto-escalate overdue approvals
   */
  async escalateOverdueApprovals(): Promise<void> {
    const { data: overdueRequests } = await supabase
      .from('approval_requests')
      .select('*, matrix:approval_matrix(*)')
      .eq('status', 'pending')
      .lt('created_at', this.getEscalationCutoff());

    if (!overdueRequests || overdueRequests.length === 0) return;

    for (const request of overdueRequests) {
      const currentLevelConfig = request.matrix.approval_sequence.find(
        (level: any) => level.level === request.current_level
      );

      if (currentLevelConfig?.timeout_hours) {
        const cutoff = new Date(request.created_at);
        cutoff.setHours(cutoff.getHours() + currentLevelConfig.timeout_hours);

        if (new Date() > cutoff) {
          await this.escalateApproval(request);
        }
      }
    }
  }

  private async completeApproval(request: ApprovalRequest): Promise<void> {
    // Update approval request
    await this.updateApprovalRequest(request.id, {
      status: 'approved',
      completed_at: new Date().toISOString()
    });

    // Update the document based on type
    switch (request.document_type) {
      case 'purchase_order':
        await this.approvePurchaseOrder(request.document_id);
        break;
      case 'bill':
        await this.approveBill(request.document_id);
        break;
      case 'payment':
        await this.approvePayment(request.document_id);
        break;
    }

    // Send completion notifications
    await this.notifyApprovalComplete(request);
  }

  private async approvePurchaseOrder(poId: string): Promise<void> {
    await supabase
      .from('purchase_orders')
      .update({
        status: 'Approved',
        approval_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', poId);

    // Commit budget
    const budgetService = new BudgetService();
    await budgetService.commitBudget(poId);
  }
}
```

## Testing Strategy

### 1. Unit Tests
```typescript
// __tests__/services/budgetService.test.ts
describe('BudgetService', () => {
  describe('validatePurchaseOrder', () => {
    it('should reject PO items exceeding budget', async () => {
      const items = [
        {
          cost_control_item_id: 'cc-001',
          amount: 10000
        }
      ];

      const mockCostControl = {
        id: 'cc-001',
        budget_amount: 5000,
        committed_amount: 0,
        actual_amount: 0
      };

      jest.spyOn(budgetService, 'getCostControlItem')
        .mockResolvedValue(mockCostControl);

      const result = await budgetService.validatePurchaseOrder(items, 'project-001');

      expect(result.valid).toBe(false);
      expect(result.totalExcess).toBe(5000);
      expect(result.items[0].excess).toBe(5000);
    });

    it('should approve PO items within budget', async () => {
      // Test implementation
    });
  });
});
```

### 2. Integration Tests
```typescript
// __tests__/integration/purchaseOrderFlow.test.ts
describe('Purchase Order Flow', () => {
  it('should complete full PO to payment cycle', async () => {
    // 1. Create PO with budget validation
    const po = await createPurchaseOrder({
      items: [{
        cost_control_item_id: 'test-cc-001',
        amount: 1000
      }]
    });

    expect(po.status).toBe('Draft');

    // 2. Submit for approval
    await submitForApproval(po.id);
    expect(po.status).toBe('Pending');

    // 3. Approve PO
    await approvePurchaseOrder(po.id, 'approver-001');
    expect(po.status).toBe('Approved');

    // 4. Verify budget commitment
    const costControl = await getCostControlItem('test-cc-001');
    expect(costControl.committed_amount).toBe(1000);

    // 5. Create goods receipt
    const gr = await createGoodsReceipt(po.id, {
      items: [{
        purchase_order_item_id: po.items[0].id,
        quantity_received: 10,
        quantity_accepted: 10
      }]
    });

    // 6. Convert to bill
    const bill = await convertPOToBill(po.id);
    expect(bill.purchase_order_id).toBe(po.id);

    // 7. Perform three-way match
    const matchResult = await performThreeWayMatch(bill.id);
    expect(matchResult.three_way_match).toBe(true);

    // 8. Process payment
    const payment = await recordPayment({
      bill_id: bill.id,
      amount: 1000,
      payment_method: 'Bank Transfer'
    });

    // 9. Verify final state
    const finalCostControl = await getCostControlItem('test-cc-001');
    expect(finalCostControl.actual_amount).toBe(1000);
    expect(finalCostControl.committed_amount).toBe(0);
  });
});
```

### 3. E2E Tests
```typescript
// cypress/integration/purchase-orders.spec.ts
describe('Purchase Orders E2E', () => {
  beforeEach(() => {
    cy.login('purchaser@example.com', 'password');
    cy.visit('/projects/test-project/cost-control/purchase-orders');
  });

  it('should create PO with catalog items', () => {
    // Click create button
    cy.findByText('Create Purchase Order').click();

    // Select supplier
    cy.findByLabelText('Supplier').select('ABC Supplies');

    // Add item from catalog
    cy.findByText('Select from Catalog').click();
    cy.findByPlaceholder('Search catalog...').type('cement');
    cy.findByText('Portland Cement Type I').click();
    cy.findByText('Add to PO').click();

    // Verify budget validation
    cy.findByText('Budget Status').should('exist');
    cy.findByText('Available: $5,000').should('exist');

    // Adjust quantity
    cy.findByLabelText('Quantity').clear().type('100');

    // Submit PO
    cy.findByText('Create Purchase Order').click();

    // Verify success
    cy.findByText('Purchase order created successfully').should('exist');
  });

  it('should show budget warnings', () => {
    // Create PO that exceeds budget
    cy.findByText('Create Purchase Order').click();
    
    // Add items exceeding budget
    // ...test implementation

    // Verify warning
    cy.findByText('Exceeds available budget').should('exist');
    cy.findByRole('button', { name: 'Create Purchase Order' })
      .should('be.disabled');
  });
});
```

## Security and Compliance

### 1. Audit Trail Implementation
```sql
-- Comprehensive audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create audit triggers for all critical tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    current_setting('app.current_user_id', true)::uuid,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_setting('app.client_ip', true)::inet,
    current_setting('app.user_agent', true),
    current_setting('app.session_id', true)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to critical tables
CREATE TRIGGER audit_purchase_orders
AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_bills
AFTER INSERT OR UPDATE OR DELETE ON bills
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments
AFTER INSERT OR UPDATE OR DELETE ON bill_payments
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

### 2. Data Encryption
```typescript
// utils/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyDerivationSalt: Buffer;

  constructor() {
    this.keyDerivationSalt = Buffer.from(
      process.env.ENCRYPTION_SALT || 'default-salt',
      'hex'
    );
  }

  /**
   * Encrypt sensitive field data
   */
  encryptField(data: string, fieldKey: string): EncryptedData {
    const key = this.deriveKey(fieldKey);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt field data
   */
  decryptField(encryptedData: EncryptedData, fieldKey: string): string {
    const key = this.deriveKey(fieldKey);
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private deriveKey(fieldKey: string): Buffer {
    return crypto.pbkdf2Sync(
      fieldKey,
      this.keyDerivationSalt,
      100000,
      32,
      'sha256'
    );
  }
}

// Usage in models
export const encryptSensitiveData = (data: any) => {
  const encryption = new EncryptionService();
  
  // Encrypt sensitive fields
  if (data.bank_account) {
    data.bank_account = encryption.encryptField(
      data.bank_account,
      'supplier_bank_account'
    );
  }

  if (data.tax_id) {
    data.tax_id = encryption.encryptField(
      data.tax_id,
      'supplier_tax_id'
    );
  }

  return data;
};
```

### 3. Compliance Checks
```typescript
// services/complianceService.ts
export class ComplianceService {
  /**
   * Validate document meets compliance requirements
   */
  async validateCompliance(
    documentType: string,
    document: any
  ): Promise<ComplianceResult> {
    const checks: ComplianceCheck[] = [];

    // Run applicable compliance checks
    switch (documentType) {
      case 'purchase_order':
        checks.push(
          await this.checkPOCompliance(document),
          await this.checkSupplierCompliance(document.supplier_id),
          await this.checkBudgetCompliance(document)
        );
        break;

      case 'bill':
        checks.push(
          await this.checkBillCompliance(document),
          await this.checkTaxCompliance(document),
          await this.checkPaymentTermsCompliance(document)
        );
        break;
    }

    const failed = checks.filter(c => !c.passed);
    
    return {
      compliant: failed.length === 0,
      checks,
      failedChecks: failed,
      warnings: checks.filter(c => c.warning)
    };
  }

  private async checkSupplierCompliance(
    supplierId: string
  ): Promise<ComplianceCheck> {
    const supplier = await this.getSupplier(supplierId);

    // Check supplier validation status
    if (!supplier.is_validated) {
      return {
        name: 'Supplier Validation',
        passed: false,
        message: 'Supplier has not been validated',
        severity: 'high'
      };
    }

    // Check for blacklist
    if (supplier.is_blacklisted) {
      return {
        name: 'Supplier Blacklist',
        passed: false,
        message: 'Supplier is blacklisted',
        severity: 'critical'
      };
    }

    // Check certifications
    const requiredCerts = ['ISO9001', 'SafetyCompliance'];
    const missingCerts = requiredCerts.filter(
      cert => !supplier.certifications?.includes(cert)
    );

    if (missingCerts.length > 0) {
      return {
        name: 'Supplier Certifications',
        passed: true,
        warning: true,
        message: `Missing certifications: ${missingCerts.join(', ')}`,
        severity: 'medium'
      };
    }

    return {
      name: 'Supplier Compliance',
      passed: true,
      message: 'All supplier checks passed'
    };
  }
}
```

## Performance Optimization

### 1. Database Indexes
```sql
-- Performance indexes for purchase orders
CREATE INDEX idx_purchase_orders_project_status 
ON purchase_orders(project_id, status);

CREATE INDEX idx_purchase_orders_supplier_date 
ON purchase_orders(supplier_id, created_at DESC);

CREATE INDEX idx_purchase_order_items_po_cost_control 
ON purchase_order_items(purchase_order_id, cost_control_item_id);

-- Performance indexes for bills
CREATE INDEX idx_bills_project_status 
ON bills(project_id, status);

CREATE INDEX idx_bills_due_date 
ON bills(due_date) 
WHERE status != 'Paid';

CREATE INDEX idx_bill_items_bill_cost_control 
ON bill_items(bill_id, cost_control_item_id);

-- Cost control performance
CREATE INDEX idx_cost_control_items_project_parent 
ON cost_control_items(project_id, parent_id);

CREATE INDEX idx_cost_control_budget_tracking 
ON cost_control_items(project_id, budget_amount, committed_amount, actual_amount);
```

### 2. Caching Strategy
```typescript
// services/cacheService.ts
import Redis from 'ioredis';

export class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
  }

  /**
   * Cache cost control items for quick budget lookups
   */
  async cacheCostControlItems(projectId: string): Promise<void> {
    const items = await this.fetchCostControlItems(projectId);
    const key = `cost_control:${projectId}`;
    
    await this.redis.setex(
      key,
      this.defaultTTL,
      JSON.stringify(items)
    );

    // Also cache individual items for quick lookups
    for (const item of items) {
      await this.redis.setex(
        `cost_control_item:${item.id}`,
        this.defaultTTL,
        JSON.stringify(item)
      );
    }
  }

  /**
   * Get cached budget availability
   */
  async getBudgetAvailability(
    costControlItemId: string
  ): Promise<number | null> {
    const cached = await this.redis.get(`cost_control_item:${costControlItemId}`);
    
    if (!cached) return null;

    const item = JSON.parse(cached);
    return item.budget_amount - item.committed_amount - item.actual_amount;
  }

  /**
   * Invalidate cache when budget changes
   */
  async invalidateBudgetCache(
    costControlItemId: string,
    projectId: string
  ): Promise<void> {
    await this.redis.del([
      `cost_control_item:${costControlItemId}`,
      `cost_control:${projectId}`
    ]);
  }

  /**
   * Cache catalog search results
   */
  async cacheCatalogSearch(
    searchKey: string,
    results: any[],
    ttl: number = 3600 // 1 hour
  ): Promise<void> {
    await this.redis.setex(
      `catalog_search:${searchKey}`,
      ttl,
      JSON.stringify(results)
    );
  }
}
```

### 3. Query Optimization
```typescript
// Optimized queries for common operations

/**
 * Get purchase orders with all related data in single query
 */
export const getPurchaseOrdersOptimized = async (
  projectId: string,
  filters?: POFilters
) => {
  const query = supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers!purchase_orders_supplier_id_fkey(id, name),
      items:purchase_order_items(
        *,
        cost_control_item:cost_control_items!purchase_order_items_cost_control_item_id_fkey(
          id,
          name,
          item_number,
          budget_amount,
          committed_amount,
          actual_amount
        )
      ),
      approval_history:approval_history(
        *,
        approver:auth.users!approval_history_approver_id_fkey(id, email)
      )
    `)
    .eq('project_id', projectId);

  // Apply filters efficiently
  if (filters?.status) {
    query.eq('status', filters.status);
  }

  if (filters?.dateRange) {
    query.gte('created_at', filters.dateRange.start)
         .lte('created_at', filters.dateRange.end);
  }

  // Use proper indexing
  query.order('created_at', { ascending: false });

  return query;
};

/**
 * Batch update cost control items efficiently
 */
export const batchUpdateCostControl = async (
  updates: Array<{
    id: string;
    committed_amount?: number;
    actual_amount?: number;
  }>
) => {
  // Use PostgreSQL's UPDATE FROM VALUES for efficiency
  const values = updates.map(u => 
    `('${u.id}'::uuid, ${u.committed_amount || 'NULL'}, ${u.actual_amount || 'NULL'})`
  ).join(',');

  const query = `
    UPDATE cost_control_items AS cc
    SET 
      committed_amount = COALESCE(v.committed_amount, cc.committed_amount),
      actual_amount = COALESCE(v.actual_amount, cc.actual_amount),
      updated_at = NOW()
    FROM (VALUES ${values}) AS v(id, committed_amount, actual_amount)
    WHERE cc.id = v.id;
  `;

  return supabase.rpc('execute_sql', { query });
};
```

## Conclusion

This comprehensive improvement guide provides a roadmap to transform the current Purchase Order and Bills system into an enterprise-grade solution. The implementation follows international standards while maintaining flexibility for construction industry-specific requirements.

Key benefits of these improvements:
- **Better Budget Control**: Prevents overspending through real-time validation
- **Increased Efficiency**: Catalog system and automation reduce manual work
- **Enhanced Compliance**: Audit trails and approval workflows ensure accountability
- **Improved Accuracy**: Three-way matching and OCR reduce errors
- **Better Insights**: Comprehensive reporting enables data-driven decisions

The phased implementation approach allows for gradual adoption while delivering value at each stage. Start with Phase 1 to address the most critical gaps, then progressively add advanced features based on user feedback and business priorities.