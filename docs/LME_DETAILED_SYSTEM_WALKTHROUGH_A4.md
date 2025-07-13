# LME Libraries System - Detailed Walkthrough & UI Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Master Catalog Management](#master-catalog-management)
3. [Library Structure & Navigation](#library-structure--navigation)
4. [Adding LME Factors to Library Items](#adding-lme-factors-to-library-items)
5. [Using Library Items in Estimates](#using-library-items-in-estimates)
6. [Reports & Analytics](#reports--analytics)
7. [User Workflows](#user-workflows)

---

## System Overview

The LME Libraries system is built on three interconnected components:

### 1. Master Catalogs (Foundation)
- **Material Catalog**: All construction materials with specifications and pricing
- **Labor Catalog**: All labor types with skill levels and hourly rates
- **Equipment Catalog**: All equipment with capacities and rental rates

### 2. Library Items (Knowledge Base)
- Hierarchical structure (3 levels)
- Level 3 items contain LME factors
- Links to master catalogs for consistency

### 3. Estimates (Application)
- Select library items
- Enter quantities
- Automatic calculation of all resources

---

## Master Catalog Management

### Material Catalog Dashboard

**Page: /admin/catalogs/materials**

#### Header Section
| Action | Description |
|--------|-------------|
| + Add Material | Create new material entry |
| Import CSV | Bulk import materials |
| Export | Download catalog data |
| 🔍 Search | Find specific materials |

#### Filter Options
- Category: All Categories / Cement / Steel / Aggregate
- Status: Active Only / All
- Updated: This Month / This Year / All Time

#### Material List View

**Category: Cement (15 items)**

| Code | Name | Unit | Price | Actions |
|------|------|------|-------|---------|
| MAT-CEM-001 | Cement OPC 42.5N | bags | $12.50 | ✏️ 📋 🗑️ |
| MAT-CEM-002 | Cement OPC 32.5N | bags | $11.00 | ✏️ 📋 🗑️ |
| MAT-CEM-003 | Cement SRC | bags | $14.00 | ✏️ 📋 🗑️ |

**Category: Steel Reinforcement (28 items)**

| Code | Name | Unit | Price | Actions |
|------|------|------|-------|---------|
| MAT-STL-001 | Rebar Y10 Grade 60 | kg | $0.85 | ✏️ 📋 🗑️ |
| MAT-STL-002 | Rebar Y12 Grade 60 | kg | $0.88 | ✏️ 📋 🗑️ |
| MAT-STL-003 | Rebar Y16 Grade 60 | kg | $0.92 | ✏️ 📋 🗑️ |

*Showing 43 of 352 materials*

### Add/Edit Material Form

**📦 Add New Material**

#### Basic Information
| Field | Input |
|-------|-------|
| Material Code* | MAT-___ (Auto-generated) |
| Material Name* | [Text input] |
| Category* | [Dropdown: Select Category] |
| Subcategory | [Dropdown: Select Subcategory] |

#### Units & Packaging
| Field | Input |
|-------|-------|
| Unit of Measurement* | [Dropdown: bags/m³/kg/liters] |
| Package Size | [Number] (e.g., 50 for 50kg) |
| Package Unit | [Text] (e.g., kg, liters) |

#### Pricing Information
| Field | Input |
|-------|-------|
| Current Price* | $[Amount] per [unit] |
| Currency | [Dropdown: USD/EUR/GBP] |
| Include VAT/Tax | ☐ Checkbox |

#### Specifications
- Technical Specs: [Text area]
- Standards: [Text] (e.g., BS EN 197-1)

#### Supplier Information

| Supplier | Code | Lead Time | Actions |
|----------|------|-----------|---------|
| ABC Supplies | CEM-425 | 3 days | ✏️ 🗑️ |
| XYZ Materials | PC-001 | 5 days | ✏️ 🗑️ |

#### Additional Settings
- ☑ Active (Available for selection)
- ☐ Hazardous Material
- ☐ Track Expiry Date
- Minimum Stock Level: [Number]

### Labor Catalog Page

**Page: /admin/catalogs/labor**

#### Trade: Masonry (12 positions)

| Code | Job Title | Skill Level | Rate | Actions |
|------|-----------|-------------|------|---------|
| LAB-MAS-SKL-001 | Mason - Skilled | Skilled | $25/hr | ✏️ 📋 |
| LAB-MAS-SEMI-001 | Mason - Semi-skilled | Semi | $18/hr | ✏️ 📋 |
| LAB-MAS-HLP-001 | Mason Helper | Unskilled | $12/hr | ✏️ 📋 |

#### Trade: Electrical (15 positions)

| Code | Job Title | Skill Level | Rate | Actions |
|------|-----------|-------------|------|---------|
| LAB-ELE-MAS-001 | Electrician Master | Master | $45/hr | ✏️ 📋 |
| LAB-ELE-JRN-001 | Electrician | Skilled | $32/hr | ✏️ 📋 |
| LAB-ELE-APP-001 | Electrician Apprentice | Apprentice | $20/hr | ✏️ 📋 |

**Quick Actions:** View Rate History | Analyze Utilization | Update All Rates

### Equipment Catalog Page

**Page: /admin/catalogs/equipment**

#### Equipment Card View

**🏗️ Concrete Mixer 0.5m³** (EQP-MIX-500L-001)
- **Category:** Mixing Equipment
- **Capacity:** 0.5m³ | **Power:** 5.5kW | **Fuel:** Diesel

| Rate Type | Price | Specifications |
|-----------|-------|----------------|
| Hourly | $45.00 | • Portable design |
| Daily | $320.00 | • Electric start |
| Weekly | $1,800.00 | • Safety certified |
| Monthly | $6,500.00 | • Operator required: No |

**Actions:** View Details | Edit | Availability | Maintenance History

---

## Library Structure & Navigation

### Library Dashboard

**Page: /library**

#### Statistics Panel
- Total Items: 1,247
- With LME Factors: 892
- Recently Updated: 45

#### Browse by Category

| Code | Category | Item Count |
|------|----------|------------|
| 01 | Preliminaries & General | 45 items |
| 02 | Substructure | 156 items |
| 03 | Superstructure | 234 items |
| 04 | External Walls | 89 items |
| 05 | Roofing | 112 items |
| 06 | Internal Finishes | 198 items |
| 07 | Services | 267 items |
| 08 | External Works | 146 items |

#### Recent Activity
- "Concrete Grade 30" factors updated by John Smith (2 hours ago)
- "Block Wall 200mm" created by Sarah Jones (Yesterday)
- Price update applied to 45 steel items (3 days ago)

### Level 3 Items List

**Page: /library/browse/02/10**

**📚 Library > 02. Substructure > 02.10 Foundations**

| Code | Name | Unit | LME | Actions |
|------|------|------|-----|---------|
| 02.10.10.01 | Concrete Grade 20 footings | m³ | ✅ | 👁️ ✏️ |
| 02.10.10.02 | Concrete Grade 25 footings | m³ | ✅ | 👁️ ✏️ |
| 02.10.10.03 | Concrete Grade 30 footings | m³ | ✅ | 👁️ ✏️ |
| 02.10.10.04 | Concrete Grade 25 strip | m³ | ✅ | 👁️ ✏️ |
| 02.10.20.01 | Reinforcement Y10 | kg | ✅ | 👁️ ✏️ |
| 02.10.20.02 | Reinforcement Y12 | kg | ✅ | 👁️ ✏️ |
| 02.10.20.03 | Reinforcement Y16 | kg | ✅ | 👁️ ✏️ |
| 02.10.30.01 | Formwork to foundations | m² | ✅ | 👁️ ✏️ |

**Legend:** ✅ = Has LME factors | ⚠️ = Missing factors | 🔒 = Locked

---

## Adding LME Factors to Library Items

### Library Item Detail View

**Page: /library/item/02.10.10.04**

#### Basic Information Panel
- **Code:** 02.10.10.04
- **Name:** Concrete Grade 25 strip foundation
- **Unit:** m³
- **Category:** 02.10 Foundations
- **Description:** Supply and place Grade 25 concrete in strip foundations including all necessary labor and equipment, formwork not included. Concrete to BS 8500-2:2015+A2:2019 specification.
- **Status:** ✅ Active | Last Updated: 2024-01-15 by John Smith

#### LME Factor Summary
| Component | Count | Cost per m³ |
|-----------|-------|-------------|
| 📦 Materials | 5 items | $178.65 |
| 👷 Labor | 3 types | $146.50 |
| 🚜 Equipment | 3 items | $18.95 |
| **Total** | | **$344.10** |

### Material Factors Tab

**📦 Material Factors**

| Material | Code | Qty/m³ | Unit | Waste% | Cost |
|----------|------|--------|------|--------|------|
| Cement OPC 42.5N | MAT-001 | 7.0 | bags | 5% | $87.50 |
| Sand (Fine) | MAT-002 | 0.42 | m³ | 5% | $18.90 |
| Aggregate 20mm | MAT-003 | 0.83 | m³ | 5% | $45.65 |
| Water | MAT-004 | 175 | liters | 0% | $8.75 |
| Plasticizer | MAT-005 | 2.1 | liters | 0% | $17.85 |

**Material Subtotal:** $178.65 per m³ (includes wastage)

### Labor Factors Tab

**👷 Labor Factors**

| Job Title | Code | Skill Level | Hrs/m³ | Crew | Rate | Cost |
|-----------|------|-------------|--------|------|------|------|
| Mason - Skilled | LAB-001 | Skilled | 1.6 | 1 | $25 | $40 |
| Helper - Unskilled | LAB-002 | Unskilled | 3.2 | 2 | $15 | $96 |
| Foreman | LAB-003 | Supervisor | 0.3 | 1 | $35 | $10.50 |

**Labor Summary:**
- Total Hours per m³: 5.1 hours (7.4 man-hours with crew)
- Total Labor Cost per m³: $146.50
- Crew Size: 4 workers

### Equipment Factors Tab

**🚜 Equipment Factors**

| Equipment | Code | Type | Hrs/m³ | Rate | Cost |
|-----------|------|------|--------|------|------|
| Concrete Mixer | EQP-001 | Mixer | 0.30 | $45 | $13.50 |
| Poker Vibrator | EQP-002 | Vibrator | 0.15 | $15 | $2.25 |
| Wheelbarrows | EQP-003 | Transport | 0.40 | $8 | $3.20 |

**Equipment Summary:**
- Total Equipment Hours per m³: 0.85 hours
- Total Equipment Cost per m³: $18.95
- Additional Costs: Fuel included in hourly rates

### Summary Tab

**📊 LME Factor Summary**

**Item:** Concrete Grade 25 strip foundation (02.10.10.04)  
**Unit:** m³

#### Cost Breakdown per Unit

| Component | Items | Base Cost | Adjustments | Final Cost |
|-----------|-------|-----------|-------------|------------|
| 📦 Materials | 5 | $170.15 | +5% waste | $178.65 |
| 👷 Labor | 3 | $146.50 | Standard | $146.50 |
| 🚜 Equipment | 3 | $18.95 | Inc. fuel | $18.95 |
| **Subtotal** | | $335.60 | | $344.10 |
| Overhead (2%) | | $6.71 | | $6.88 |
| **Total Cost/m³** | | $342.31 | | **$350.98** |

#### Resource Requirements Summary
- Materials: 5 types with 5% average wastage
- Labor: 5.1 work hours (7.4 man-hours with crew)
- Equipment: 0.85 equipment hours

**Validation Status:** ✅ All factors validated  
**Last Updated:** 2024-01-15 14:30 by John Smith

---

## Using Library Items in Estimates

### Creating an Estimate

**Page: /estimates/new**

#### Project Details Form
| Field | Input |
|-------|-------|
| Project Name | Riverside Commercial Complex |
| Client | ABC Development Corp. |
| Location | Downtown Riverside |
| Start Date | 01/03/2024 |
| End Date | 31/12/2024 |

### Adding Library Items to Estimate

**Page: /estimates/{id}/items**

#### Current Estimate Items

| # | Code | Description | Qty | Unit | Total Cost |
|---|------|-------------|-----|------|------------|
| 1 | 02.10.10.04 | Concrete Grade 25 strip foundation | 100 | m³ | $35,100 |
| | | 📦 Mat: $17,865 \| 👷 Lab: $14,650 \| 🚜 Eq: $2,585 | | | |
| 2 | 02.10.20.03 | Reinforcement Y16 | 2,500 | kg | $3,125 |
| | | 📦 Mat: $2,300 \| 👷 Lab: $750 \| 🚜 Eq: $75 | | | |
| 3 | 02.10.30.01 | Formwork to foundations | 450 | m² | $11,250 |
| | | 📦 Mat: $4,500 \| 👷 Lab: $5,850 \| 🚜 Eq: $900 | | | |

#### Estimate Summary
- **Total Materials:** $24,665
- **Total Labor:** $21,250
- **Total Equipment:** $3,560
- **Grand Total:** $49,475

### Item Detail View in Estimate

**📋 Estimate Item Details**

**Item:** 02.10.10.04 - Concrete Grade 25 strip foundation  
**Quantity:** 100 m³ | **Location:** Foundation Grid A-E

#### Material Requirements (for 100 m³)

| Material | Required | Delivered | Used | Stock | Cost |
|----------|----------|-----------|------|-------|------|
| Cement OPC 42.5N | 735 bags | 0 | 0 | 0 | $9,188 |
| Sand (Fine) | 44.1 m³ | 0 | 0 | 0 | $1,985 |
| Aggregate 20mm | 87.15 m³ | 0 | 0 | 0 | $4,793 |
| Water | 17,500 L | 0 | 0 | 0 | $875 |
| Plasticizer | 210 L | 0 | 0 | 0 | $1,785 |
| **Total Materials** | | | | | **$18,626** |

**Notes:**
- Quantities include 5% wastage factor
- Prices current as of 2024-01-15
- Click material name to view specifications

---

## Reports & Analytics

### LME Analytics Dashboard

**Page: /analytics/lme**

#### Material Usage Panel

**Top 5 Materials:**
1. Cement: 2,450 bags
2. Rebar: 15,300 kg
3. Sand: 185 m³
4. Concrete: 520 m³
5. Blocks: 8,500 pcs

#### Labor Utilization Panel

**By Trade:**
- Masonry: 3,200 hrs (45%)
- Electrical: 1,800 hrs (25%)
- Plumbing: 1,100 hrs (15%)
- Carpentry: 750 hrs (11%)
- Others: 280 hrs (4%)

**Total:** 7,130 hours

#### Cost Analysis by Category

| Category | Amount | Percentage | Visual |
|----------|--------|------------|--------|
| Materials | $245,680 | 58% | ████████████████░░░ |
| Labor | $142,300 | 34% | ████████████░░░░░░░ |
| Equipment | $33,750 | 8% | ███░░░░░░░░░░░░░░░░ |
| **Total** | **$421,730** | **100%** | |

### Price Trend Analysis

**Page: /analytics/price-trends**

**Material:** Cement OPC 42.5N  
**Period:** Last 12 Months

#### Price Statistics
- **Current Price:** $12.50 per bag
- **12-Month Change:** +13.6% ($1.50)
- **Average Price:** $11.75
- **Price Volatility:** Low

#### Price Alerts
- ⚠️ Price increased 8% in last 90 days
- 📊 Above 12-month average by 6.4%

---

## User Workflows

### Workflow 1: Setting Up a New Construction Item

1. **Navigate to Library**
   - Go to /library
   - Select category (e.g., "02. Substructure")

2. **Create Level 3 Item**
   - Click "+ Create Item"
   - Enter: code, name, unit, description
   - Save item

3. **Add Material Factors**
   - Open item → Materials tab
   - Click "+ Add Material from Catalog"
   - Search and select materials
   - Enter quantities per unit
   - Set wastage percentages

4. **Add Labor Factors**
   - Switch to Labor tab
   - Add required labor types
   - Specify hours per unit
   - Define crew sizes

5. **Add Equipment Factors**
   - Switch to Equipment tab
   - Select equipment from catalog
   - Enter hours per unit
   - Configure additional costs

6. **Review and Validate**
   - Check Summary tab
   - Verify total costs
   - Save all factors

### Workflow 2: Creating an Estimate

1. **Start New Estimate**
   - Create project details
   - Save basic information

2. **Add Library Items**
   - Click "+ Add from Library"
   - Browse or search for items
   - Select multiple items
   - Add to estimate

3. **Enter Quantities**
   - For each item, enter required quantity
   - System calculates all resources automatically

4. **Review Resources**
   - Check material requirements
   - Review labor hours
   - Verify equipment needs

5. **Generate Reports**
   - Create material schedule
   - Generate labor plan
   - Export to Excel/PDF

### Workflow 3: Updating Master Catalog Prices

1. **Access Catalog Management**
   - Go to /admin/catalogs
   - Select catalog type

2. **Update Prices**
   - Use bulk update for percentage increases
   - Or edit individual items
   - Add notes for price changes

3. **Review Impact**
   - System shows affected library items
   - Preview cost changes
   - Confirm updates

4. **Apply Changes**
   - Updates flow to all library items
   - Existing estimates can be refreshed
   - Historical prices maintained

---

## Key Benefits Realized

### For Different Stakeholders

| Stakeholder | Benefits |
|-------------|----------|
| **Estimators** | • Create estimates in minutes<br>• No manual calculations<br>• Consistent factors across projects |
| **Project Managers** | • Instant resource visibility<br>• Accurate schedules<br>• Track actual vs. estimated |
| **Management** | • Company-wide consistency<br>• Deep cost insights<br>• Faster, accurate bidding |
| **Procurement** | • Consolidated requirements<br>• Volume-based pricing<br>• Complete purchase history |

This comprehensive system transforms estimation from a manual, error-prone process into an automated, accurate, and insightful business tool that drives efficiency and profitability.