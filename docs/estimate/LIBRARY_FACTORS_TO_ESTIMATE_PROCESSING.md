# Library Factors to Estimate Processing: Complete Guide

## Overview

This document explains in detail what happens to the factors attached to fourth level library items when they are transferred to estimate detail items. The factor processing system ensures that all material, labor, and equipment calculations are accurate, consistent, and traceable.

## Understanding Library Item Factors

### What Are Library Item Factors?

Library item factors are the building blocks that define the cost composition of each construction item. Every confirmed library item has three types of factors:

#### 1. Material Factors
- **Cement**: 0.35 bags per m³
- **Steel Reinforcement**: 120 kg per m³  
- **Aggregates**: 0.8 m³ per m³
- **Water**: 200 liters per m³
- **Additives**: 2 kg per m³

#### 2. Labor Factors
- **Skilled Worker**: 2.5 hours per m³
- **Semi-skilled Worker**: 4.0 hours per m³
- **Unskilled Worker**: 6.0 hours per m³
- **Supervisor**: 0.5 hours per m³

#### 3. Equipment Factors
- **Concrete Mixer**: 1.2 hours per m³
- **Vibrator**: 0.8 hours per m³
- **Crane**: 0.3 hours per m³
- **Tools**: 0.5 hours per m³

### Example: Concrete Grade 25 Strip Foundation

**Library Item**: `03.10.10.01 - Concrete Grade 25 strip foundation`

**Attached Factors:**
```
Material Factors:
├── Cement (50kg bags): 7.0 bags/m³
├── Steel Reinforcement: 80 kg/m³
├── Coarse Aggregates: 0.85 m³/m³
├── Fine Aggregates: 0.45 m³/m³
├── Water: 180 liters/m³
└── Plasticizer: 1.5 kg/m³

Labor Factors:
├── Mason: 3.0 hours/m³
├── Helper: 6.0 hours/m³
├── Steel Fixer: 2.0 hours/m³
└── Foreman: 0.5 hours/m³

Equipment Factors:
├── Concrete Mixer: 1.0 hours/m³
├── Vibrator: 0.5 hours/m³
├── Water Pump: 0.3 hours/m³
└── Hand Tools: 1.0 hours/m³
```

## Factor Processing Workflow

### Step 1: Factor Retrieval
When a library item is selected for an estimate:

```typescript
// System retrieves all factors for the library item
const libraryItem = await LibraryService.getItem('03.10.10.01');
const materialFactors = await FactorService.getMaterialFactors(libraryItem.id);
const laborFactors = await FactorService.getLaborFactors(libraryItem.id);
const equipmentFactors = await FactorService.getEquipmentFactors(libraryItem.id);
```

**Result**: All factor relationships are loaded with their quantities and specifications.

### Step 2: Project Rate Application
The system applies current project rates to each factor:

```typescript
// Get project-specific rates
const projectRates = await ProjectService.getRates(projectId);

// Apply rates to material factors
for (const factor of materialFactors) {
  const unitRate = projectRates.materials[factor.catalogueId] || factor.defaultRate;
  factor.calculatedRate = unitRate;
  factor.calculatedAmount = factor.quantityPerUnit * unitRate;
}
```

**Example Calculation:**
```
Cement Factor:
- Quantity: 7.0 bags/m³
- Project Rate: $8.50 per bag
- Base Cost: 7.0 × $8.50 = $59.50/m³
```

### Step 3: Factor Adjustments
The system applies wastage, productivity, and efficiency factors:

#### Material Wastage Application
```typescript
// Apply wastage percentage to materials
for (const factor of materialFactors) {
  const wastageMultiplier = 1 + (factor.wastagePercentage / 100);
  factor.adjustedQuantity = factor.quantityPerUnit * wastageMultiplier;
  factor.finalAmount = factor.adjustedQuantity * factor.calculatedRate;
}
```

**Example:**
```
Cement with 5% Wastage:
- Base Quantity: 7.0 bags/m³
- Wastage: 5%
- Adjusted Quantity: 7.0 × 1.05 = 7.35 bags/m³
- Final Cost: 7.35 × $8.50 = $62.48/m³
```

#### Labor Productivity Application
```typescript
// Apply productivity factors to labor
for (const factor of laborFactors) {
  const productivityMultiplier = factor.productivityFactor || 1.0;
  factor.adjustedHours = factor.hoursPerUnit * productivityMultiplier;
  factor.finalAmount = factor.adjustedHours * factor.calculatedRate;
}
```

**Example:**
```
Mason Labor with 0.9 Productivity:
- Base Hours: 3.0 hours/m³
- Productivity Factor: 0.9 (10% more efficient)
- Adjusted Hours: 3.0 × 0.9 = 2.7 hours/m³
- Rate: $25.00/hour
- Final Cost: 2.7 × $25.00 = $67.50/m³
```

#### Equipment Efficiency Application
```typescript
// Apply efficiency factors to equipment
for (const factor of equipmentFactors) {
  const efficiencyMultiplier = factor.efficiencyFactor || 1.0;
  factor.adjustedHours = factor.hoursPerUnit * efficiencyMultiplier;
  factor.finalAmount = factor.adjustedHours * factor.calculatedRate;
}
```

### Step 4: Cost Aggregation
The system calculates total costs by category:

```typescript
// Calculate category totals
const totalMaterialCost = materialFactors.reduce((sum, factor) => 
  sum + factor.finalAmount, 0);

const totalLaborCost = laborFactors.reduce((sum, factor) => 
  sum + factor.finalAmount, 0);

const totalEquipmentCost = equipmentFactors.reduce((sum, factor) => 
  sum + factor.finalAmount, 0);

const totalRate = totalMaterialCost + totalLaborCost + totalEquipmentCost;
```

## Complete Factor Processing Example

### Library Item: Concrete Grade 25 Strip Foundation

**Original Library Factors:**
```
Material Factors:
├── Cement: 7.0 bags/m³ (5% wastage)
├── Steel: 80 kg/m³ (8% wastage)
├── Coarse Aggregates: 0.85 m³/m³ (3% wastage)
├── Fine Aggregates: 0.45 m³/m³ (3% wastage)
├── Water: 180 liters/m³ (0% wastage)
└── Plasticizer: 1.5 kg/m³ (2% wastage)

Labor Factors:
├── Mason: 3.0 hours/m³ (0.9 productivity)
├── Helper: 6.0 hours/m³ (1.0 productivity)
├── Steel Fixer: 2.0 hours/m³ (0.85 productivity)
└── Foreman: 0.5 hours/m³ (1.0 productivity)

Equipment Factors:
├── Concrete Mixer: 1.0 hours/m³ (0.95 efficiency)
├── Vibrator: 0.5 hours/m³ (1.0 efficiency)
├── Water Pump: 0.3 hours/m³ (1.0 efficiency)
└── Hand Tools: 1.0 hours/m³ (1.0 efficiency)
```

**Project Rates Applied:**
```
Material Rates:
├── Cement: $8.50/bag
├── Steel: $1.20/kg
├── Coarse Aggregates: $35.00/m³
├── Fine Aggregates: $28.00/m³
├── Water: $0.05/liter
└── Plasticizer: $3.80/kg

Labor Rates:
├── Mason: $25.00/hour
├── Helper: $18.00/hour
├── Steel Fixer: $28.00/hour
└── Foreman: $35.00/hour

Equipment Rates:
├── Concrete Mixer: $15.00/hour
├── Vibrator: $8.00/hour
├── Water Pump: $12.00/hour
└── Hand Tools: $5.00/hour
```

**Processed Factor Calculations:**

#### Material Costs (with wastage):
```
Cement: 7.0 × 1.05 × $8.50 = $62.48/m³
Steel: 80 × 1.08 × $1.20 = $103.68/m³
Coarse Aggregates: 0.85 × 1.03 × $35.00 = $30.68/m³
Fine Aggregates: 0.45 × 1.03 × $28.00 = $12.98/m³
Water: 180 × 1.00 × $0.05 = $9.00/m³
Plasticizer: 1.5 × 1.02 × $3.80 = $5.81/m³
────────────────────────────────────────
Total Material Cost: $224.63/m³
```

#### Labor Costs (with productivity):
```
Mason: 3.0 × 0.9 × $25.00 = $67.50/m³
Helper: 6.0 × 1.0 × $18.00 = $108.00/m³
Steel Fixer: 2.0 × 0.85 × $28.00 = $47.60/m³
Foreman: 0.5 × 1.0 × $35.00 = $17.50/m³
────────────────────────────────────────
Total Labor Cost: $240.60/m³
```

#### Equipment Costs (with efficiency):
```
Concrete Mixer: 1.0 × 0.95 × $15.00 = $14.25/m³
Vibrator: 0.5 × 1.0 × $8.00 = $4.00/m³
Water Pump: 0.3 × 1.0 × $12.00 = $3.60/m³
Hand Tools: 1.0 × 1.0 × $5.00 = $5.00/m³
────────────────────────────────────────
Total Equipment Cost: $26.85/m³
```

**Final Estimate Detail Item:**
```
Item: 03.10.10.01 - Concrete Grade 25 strip foundation
Unit: m³
Rate Breakdown:
├── Materials: $224.63/m³ (46.7%)
├── Labor: $240.60/m³ (50.0%)
├── Equipment: $26.85/m³ (5.6%)
└── Total Rate: $492.08/m³
```

## Estimate Detail Item Creation

### Database Storage
When the estimate detail item is created, all factor information is preserved:

```sql
-- Estimate detail item record
INSERT INTO estimate_detail_items (
  project_id,
  element_id,
  library_item_id,
  name,
  quantity,
  unit,
  rate,
  amount,
  library_code,
  library_path,
  factor_breakdown
) VALUES (
  'project-123',
  'element-456',
  'lib-item-789',
  '03.10.10.01 - Concrete Grade 25 strip foundation',
  25.0,
  'm³',
  492.08,
  12302.00,
  '03.10.10.01',
  '03.10.10.01',
  '{"materials": [{"id": "cement", "quantity": 7.35, "rate": 8.50, "amount": 62.48}, ...], "labor": [...], "equipment": [...]}'
);
```

### Factor Breakdown JSON Structure
```json
{
  "materials": [
    {
      "catalogueId": "cement-50kg",
      "name": "Cement 50kg Bags",
      "baseQuantity": 7.0,
      "wastagePercentage": 5.0,
      "adjustedQuantity": 7.35,
      "rate": 8.50,
      "amount": 62.48
    },
    {
      "catalogueId": "steel-reinforcement",
      "name": "Steel Reinforcement",
      "baseQuantity": 80.0,
      "wastagePercentage": 8.0,
      "adjustedQuantity": 86.4,
      "rate": 1.20,
      "amount": 103.68
    }
  ],
  "labor": [
    {
      "catalogueId": "mason-skilled",
      "name": "Skilled Mason",
      "baseHours": 3.0,
      "productivityFactor": 0.9,
      "adjustedHours": 2.7,
      "rate": 25.00,
      "amount": 67.50
    }
  ],
  "equipment": [
    {
      "catalogueId": "concrete-mixer",
      "name": "Concrete Mixer",
      "baseHours": 1.0,
      "efficiencyFactor": 0.95,
      "adjustedHours": 0.95,
      "rate": 15.00,
      "amount": 14.25
    }
  ],
  "totals": {
    "materialCost": 224.63,
    "laborCost": 240.60,
    "equipmentCost": 26.85,
    "totalRate": 492.08
  }
}
```

## Benefits of Factor Processing

### 1. **Accuracy and Precision**
- **Real Quantities**: Based on actual material requirements, not estimates
- **Proven Factors**: Derived from successful project data
- **Adjusted for Reality**: Includes wastage, productivity, and efficiency
- **Project-Specific**: Uses current project rates and conditions

### 2. **Consistency Across Projects**
- **Same Base Factors**: All projects use identical factor definitions
- **Standardized Calculations**: Consistent application of adjustments
- **Comparable Results**: Estimates can be reliably compared
- **Quality Control**: Prevents arbitrary or inconsistent pricing

### 3. **Transparency and Traceability**
- **Complete Breakdown**: See exactly what drives each cost
- **Factor Source**: Trace back to original library definitions
- **Adjustment History**: Track how factors were modified
- **Audit Trail**: Complete record of all calculations

### 4. **Flexibility and Adaptability**
- **Rate Updates**: Change project rates without affecting factors
- **Factor Improvements**: Update library factors for all future estimates
- **Scenario Analysis**: Test different rates and adjustments
- **Regional Variations**: Apply local rates to standard factors

## Factor Updates and Recalculation

### When Library Factors Change
If library factors are updated (e.g., cement requirement reduced from 7.0 to 6.8 bags/m³):

1. **Existing Estimates**: Keep original factors to maintain estimate integrity
2. **New Estimates**: Use updated factors automatically
3. **Recalculation Option**: Allow users to update existing estimates with new factors
4. **Version Control**: Track factor changes and their impact

### When Project Rates Change
If project rates are updated (e.g., cement price increases from $8.50 to $9.20):

1. **Automatic Recalculation**: System recalculates all affected estimate items
2. **Factor Preservation**: Original factors and adjustments remain unchanged
3. **Updated Amounts**: New rates applied to existing factor quantities
4. **Change Tracking**: Record of rate changes and their impact

## Technical Implementation

### Factor Processing Service
```typescript
class FactorProcessingService {
  static async processLibraryItemFactors(
    libraryItemId: string,
    projectId: string,
    quantity: number = 1
  ): Promise<ProcessedFactorResult> {
    
    // Step 1: Retrieve library factors
    const libraryItem = await LibraryService.getItem(libraryItemId);
    const materialFactors = await FactorService.getMaterialFactors(libraryItemId);
    const laborFactors = await FactorService.getLaborFactors(libraryItemId);
    const equipmentFactors = await FactorService.getEquipmentFactors(libraryItemId);
    
    // Step 2: Get project rates
    const projectRates = await ProjectService.getRates(projectId);
    
    // Step 3: Process material factors
    const processedMaterials = await this.processMaterialFactors(
      materialFactors, 
      projectRates, 
      quantity
    );
    
    // Step 4: Process labor factors
    const processedLabor = await this.processLaborFactors(
      laborFactors, 
      projectRates, 
      quantity
    );
    
    // Step 5: Process equipment factors
    const processedEquipment = await this.processEquipmentFactors(
      equipmentFactors, 
      projectRates, 
      quantity
    );
    
    // Step 6: Calculate totals
    const totals = this.calculateTotals(
      processedMaterials, 
      processedLabor, 
      processedEquipment
    );
    
    return {
      libraryItem,
      materials: processedMaterials,
      labor: processedLabor,
      equipment: processedEquipment,
      totals,
      breakdown: this.createBreakdownJson(processedMaterials, processedLabor, processedEquipment)
    };
  }
}
```

## Conclusion

The factor processing system ensures that every estimate detail item has accurate, consistent, and traceable costing. By transferring library factors through a systematic calculation process, the system:

1. **Maintains Accuracy**: Real quantities and proven factors
2. **Ensures Consistency**: Same factors used across all projects
3. **Provides Transparency**: Complete breakdown of all costs
4. **Enables Flexibility**: Easy updates and scenario analysis
5. **Supports Traceability**: Complete audit trail of calculations

This approach transforms estimate creation from guesswork to data-driven precision, ensuring that every estimate is based on proven, accurate, and consistently applied construction factors.