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

The LME Libraries system is built on a foundation of three interconnected components:

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

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📦 Material Catalog Management                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Add Material]  [Import CSV]  [Export]  [🔍 Search materials...]     │
│                                                                         │
│ Filter by: [All Categories ▼] [Active Only ▼] [Updated This Month ▼]   │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Category: Cement (15 items)                              [▼/▲]   │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ Code         Name                    Unit    Price    Actions    │   │
│ │ MAT-CEM-001  Cement OPC 42.5N       bags    $12.50   [✏️][📋][🗑️]│   │
│ │ MAT-CEM-002  Cement OPC 32.5N       bags    $11.00   [✏️][📋][🗑️]│   │
│ │ MAT-CEM-003  Cement SRC             bags    $14.00   [✏️][📋][🗑️]│   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Category: Steel Reinforcement (28 items)                 [▼/▲]   │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ Code         Name                    Unit    Price    Actions    │   │
│ │ MAT-STL-001  Rebar Y10 Grade 60     kg      $0.85    [✏️][📋][🗑️]│   │
│ │ MAT-STL-002  Rebar Y12 Grade 60     kg      $0.88    [✏️][📋][🗑️]│   │
│ │ MAT-STL-003  Rebar Y16 Grade 60     kg      $0.92    [✏️][📋][🗑️]│   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Showing 43 of 352 materials                          [Previous] [Next]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Add/Edit Material Form

**Modal: Material Details**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📦 Add New Material                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Basic Information:                                                      │
│ Material Code*: [MAT-___________] (Auto-generated or custom)           │
│ Material Name*: [_____________________________________]                │
│ Category*:      [Select Category ▼]                                    │
│ Subcategory:    [Select Subcategory ▼]                                │
│                                                                         │
│ Units & Packaging:                                                      │
│ Unit of Measurement*: [Select Unit ▼] (bags, m³, kg, liters, etc.)    │
│ Package Size:         [________] (e.g., 50 for 50kg bags)             │
│ Package Unit:         [________] (e.g., kg, liters)                   │
│                                                                         │
│ Pricing Information:                                                    │
│ Current Price*:    $[_______] per [unit]                              │
│ Currency:          [USD ▼]                                            │
│ ☐ Include VAT/Tax in price                                            │
│                                                                         │
│ Specifications:                                                         │
│ Technical Specs:   [________________________________]                 │
│                    [________________________________]                 │
│ Standards:         [_____________________] (e.g., BS EN 197-1)        │
│                                                                         │
│ Supplier Information:                                                   │
│ Preferred Suppliers: [+ Add Supplier]                                  │
│ ┌──────────────────────────────────────────────────┐                 │
│ │ Supplier         Code        Lead Time   Actions │                 │
│ │ ABC Supplies     CEM-425     3 days      [✏️][🗑️] │                 │
│ │ XYZ Materials    PC-001      5 days      [✏️][🗑️] │                 │
│ └──────────────────────────────────────────────────┘                 │
│                                                                         │
│ Additional Settings:                                                    │
│ ☑ Active (Available for selection)                                     │
│ ☐ Hazardous Material (Requires special handling)                      │
│ ☐ Track Expiry Date                                                   │
│ Minimum Stock Level: [_______] (Optional, for alerts)                 │
│                                                                         │
│ [Save Material]                                    [Cancel]            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Labor Catalog Page

**Page: /admin/catalogs/labor**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 👷 Labor Catalog Management                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Add Labor Type]  [Import CSV]  [Bulk Rate Update]  [🔍 Search...]   │
│                                                                         │
│ Filter by: [All Trades ▼] [All Skill Levels ▼] [Active Only ▼]        │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Trade: Masonry (12 positions)                            [▼/▲]   │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ Code           Job Title              Skill      Rate   Actions  │   │
│ │ LAB-MAS-SKL-001 Mason - Skilled       Skilled    $25/hr [✏️][📋] │   │
│ │ LAB-MAS-SEMI-001 Mason - Semi-skilled Semi       $18/hr [✏️][📋] │   │
│ │ LAB-MAS-HLP-001 Mason Helper          Unskilled  $12/hr [✏️][📋] │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Trade: Electrical (15 positions)                         [▼/▲]   │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ Code           Job Title              Skill      Rate   Actions  │   │
│ │ LAB-ELE-MAS-001 Electrician Master    Master     $45/hr [✏️][📋] │   │
│ │ LAB-ELE-JRN-001 Electrician           Skilled    $32/hr [✏️][📋] │   │
│ │ LAB-ELE-APP-001 Electrician Apprentice Apprentice $20/hr [✏️][📋] │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Quick Actions:                                                          │
│ [📊 View Rate History] [📈 Analyze Utilization] [🔄 Update All Rates]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Equipment Catalog Page

**Page: /admin/catalogs/equipment**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🚜 Equipment Catalog Management                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Add Equipment]  [Import Fleet]  [Maintenance Schedule]  [🔍 Search] │
│                                                                         │
│ View: [Grid View] [List View] [Calendar View]                          │
│                                                                         │
│ ┌────────────────────────────────────────────────────────────┐        │
│ │ 🏗️ Concrete Mixer 0.5m³              EQP-MIX-500L-001      │        │
│ │ Category: Mixing Equipment                                  │        │
│ │ Capacity: 0.5m³ | Power: 5.5kW | Fuel: Diesel             │        │
│ │                                                             │        │
│ │ Rates:                     Specifications:                  │        │
│ │ Hourly: $45.00            • Portable design                │        │
│ │ Daily: $320.00            • Electric start                 │        │
│ │ Weekly: $1,800.00         • Safety certified               │        │
│ │ Monthly: $6,500.00        • Operator required: No          │        │
│ │                                                             │        │
│ │ [View Details] [Edit] [Availability] [Maintenance History] │        │
│ └────────────────────────────────────────────────────────────┘        │
│                                                                         │
│ ┌────────────────────────────────────────────────────────────┐        │
│ │ 🏗️ Tower Crane 25 Ton                  EQP-CRN-25T-001     │        │
│ │ Category: Lifting Equipment                                 │        │
│ │ Capacity: 25 tons | Height: 65m | Radius: 50m             │        │
│ │                                                             │        │
│ │ Rates:                     Specifications:                  │        │
│ │ Daily: $850.00            • Includes operator              │        │
│ │ Weekly: $5,500.00         • Setup cost: $15,000            │        │
│ │ Monthly: $18,000.00       • Requires certified operator     │        │
│ │                           • Monthly inspection required      │        │
│ │                                                             │        │
│ │ [View Details] [Edit] [Availability] [Safety Certificates] │        │
│ └────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Library Structure & Navigation

### Library Dashboard

**Page: /library**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Construction Library                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Create Item] [Import Library] [Export] [🔍 Search all items...]     │
│                                                                         │
│ Library Statistics:                                                     │
│ Total Items: 1,247 | With LME Factors: 892 | Recently Updated: 45     │
│                                                                         │
│ Browse by Category:                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ 📁 01. Preliminaries & General                         (45 items)│   │
│ │ 📁 02. Substructure                                   (156 items)│   │
│ │ 📁 03. Superstructure                                 (234 items)│   │
│ │ 📁 04. External Walls                                  (89 items)│   │
│ │ 📁 05. Roofing                                        (112 items)│   │
│ │ 📁 06. Internal Finishes                              (198 items)│   │
│ │ 📁 07. Services                                       (267 items)│   │
│ │ 📁 08. External Works                                 (146 items)│   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Recent Activity:                                                        │
│ • "Concrete Grade 30" factors updated by John Smith (2 hours ago)     │
│ • "Block Wall 200mm" created by Sarah Jones (Yesterday)               │
│ • Price update applied to 45 steel items (3 days ago)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Library Item Browser (3-Level Navigation)

**Page: /library/browse/02**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Library > 02. Substructure                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Breadcrumb: Library > 02. Substructure                                 │
│                                                                         │
│ Level 2 - Categories:                                                   │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ 📁 02.10 Foundations                                   (45 items)│   │
│ │    └─ Footings, Strip foundations, Raft foundations              │   │
│ │                                                                   │   │
│ │ 📁 02.20 Basement Construction                         (28 items)│   │
│ │    └─ Basement walls, Waterproofing, Drainage                    │   │
│ │                                                                   │   │
│ │ 📁 02.30 Ground Beams                                  (15 items)│   │
│ │    └─ Reinforced beams, Grade beams, Tie beams                   │   │
│ │                                                                   │   │
│ │ 📁 02.40 Pile Foundations                              (38 items)│   │
│ │    └─ Bored piles, Driven piles, Pile caps                       │   │
│ │                                                                   │   │
│ │ 📁 02.50 Retaining Structures                          (30 items)│   │
│ │    └─ Retaining walls, Sheet piling, Soil anchors                │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ [← Back to Categories]                          [View as List] [Grid]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Level 3 Items List

**Page: /library/browse/02/10**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Library > 02. Substructure > 02.10 Foundations                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Add New Item] [Bulk Edit] [Export List] [🔍 Filter items...]       │
│                                                                         │
│ Showing 45 items in "02.10 Foundations"                Sort by: Name ▼ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Code         Name                          Unit   LME    Actions │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ 02.10.10.01  Concrete Grade 20 footings    m³     ✅     [👁️][✏️] │   │
│ │ 02.10.10.02  Concrete Grade 25 footings    m³     ✅     [👁️][✏️] │   │
│ │ 02.10.10.03  Concrete Grade 30 footings    m³     ✅     [👁️][✏️] │   │
│ │ 02.10.10.04  Concrete Grade 25 strip       m³     ✅     [👁️][✏️] │   │
│ │ 02.10.20.01  Reinforcement Y10             kg     ✅     [👁️][✏️] │   │
│ │ 02.10.20.02  Reinforcement Y12             kg     ✅     [👁️][✏️] │   │
│ │ 02.10.20.03  Reinforcement Y16             kg     ✅     [👁️][✏️] │   │
│ │ 02.10.30.01  Formwork to foundations       m²     ✅     [👁️][✏️] │   │
│ │ 02.10.40.01  Waterproof membrane           m²     ✅     [👁️][✏️] │   │
│ │ 02.10.50.01  Excavation for foundations    m³     ✅     [👁️][✏️] │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Legend: ✅ = Has LME factors | ⚠️ = Missing factors | 🔒 = Locked      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Adding LME Factors to Library Items

### Library Item Detail View

**Page: /library/item/02.10.10.04**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 Library Item: 02.10.10.04 - Concrete Grade 25 strip foundation     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [Edit Basic Info] [Clone Item] [View History] [Delete]                │
│                                                                         │
│ Basic Information:                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Code: 02.10.10.04                                               │   │
│ │ Name: Concrete Grade 25 strip foundation                        │   │
│ │ Unit: m³                                                         │   │
│ │ Category: 02.10 Foundations                                      │   │
│ │                                                                  │   │
│ │ Standard Description:                                            │   │
│ │ Supply and place Grade 25 concrete in strip foundations         │   │
│ │ including all necessary labor and equipment, formwork not       │   │
│ │ included. Concrete to BS 8500-2:2015+A2:2019 specification.    │   │
│ │                                                                  │   │
│ │ Status: ✅ Active | Last Updated: 2024-01-15 by John Smith      │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ LME Factor Summary:                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ 📦 Materials: 5 items totaling $178.65 per m³                   │   │
│ │ 👷 Labor: 3 types totaling 5.1 hours per m³                     │   │
│ │ 🚜 Equipment: 3 items totaling 0.85 hours per m³                │   │
│ │                                                                  │   │
│ │ Total Estimated Cost per m³: $351.00                            │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ [View Detailed Factors ▼]                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### LME Factors Management Interface

**Page: /library/item/02.10.10.04/factors**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔧 Manage LME Factors: Concrete Grade 25 strip foundation              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Tabs: [📦 Materials] [👷 Labor] [🚜 Equipment] [📊 Summary]            │
│                                                                         │
│ ╔═══════════════════════════════════════════════════════════════════╗ │
│ ║ 📦 Material Factors                                               ║ │
│ ╟───────────────────────────────────────────────────────────────────╢ │
│ ║                                                                   ║ │
│ ║ [+ Add Material from Catalog] [Import List] [Clear All]          ║ │
│ ║                                                                   ║ │
│ ║ Current Materials:                                                ║ │
│ ║ ┌───────────────────────────────────────────────────────────┐   ║ │
│ ║ │ Material              Code      Qty/m³  Unit   Waste% Cost│   ║ │
│ ║ ├───────────────────────────────────────────────────────────┤   ║ │
│ ║ │ Cement OPC 42.5N     MAT-001   7.0     bags   5%    $87.50│   ║ │
│ ║ │   Notes: 50kg bags, stored in dry conditions             │   ║ │
│ ║ │   [✏️ Edit] [📋 Duplicate] [🗑️ Remove]                    │   ║ │
│ ║ │                                                           │   ║ │
│ ║ │ Sand (Fine)          MAT-002   0.42    m³     5%    $18.90│   ║ │
│ ║ │   Notes: River sand, 0-4mm grading                       │   ║ │
│ ║ │   [✏️ Edit] [📋 Duplicate] [🗑️ Remove]                    │   ║ │
│ ║ │                                                           │   ║ │
│ ║ │ Aggregate 20mm       MAT-003   0.83    m³     5%    $45.65│   ║ │
│ ║ │   Notes: Crushed stone, 20mm nominal size                │   ║ │
│ ║ │   [✏️ Edit] [📋 Duplicate] [🗑️ Remove]                    │   ║ │
│ ║ │                                                           │   ║ │
│ ║ │ Water                MAT-004   175     liters 0%    $8.75 │   ║ │
│ ║ │   Notes: Clean, potable water                            │   ║ │
│ ║ │   [✏️ Edit] [📋 Duplicate] [🗑️ Remove]                    │   ║ │
│ ║ │                                                           │   ║ │
│ ║ │ Plasticizer          MAT-005   2.1     liters 0%    $17.85│   ║ │
│ ║ │   Notes: High-range water reducer                        │   ║ │
│ ║ │   [✏️ Edit] [📋 Duplicate] [🗑️ Remove]                    │   ║ │
│ ║ └───────────────────────────────────────────────────────────┘   ║ │
│ ║                                                                   ║ │
│ ║ Material Subtotal: $178.65 per m³ (includes wastage)            ║ │
│ ╚═══════════════════════════════════════════════════════════════════╝ │
│                                                                         │
│ [Save Changes] [Calculate Total] [Preview in Estimate] [Cancel]       │
└─────────────────────────────────────────────────────────────────────────┘
```

### Adding Material Factor Modal

**Modal: Select Material from Catalog**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📦 Add Material Factor                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Step 1: Search and Select Material                                     │
│                                                                         │
│ Search: [🔍 Type material name or code...]                             │
│ Category: [All Categories ▼]                                           │
│                                                                         │
│ Search Results:                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ ○ Cement OPC 32.5N (MAT-CEM-002)              bags @ $11.00/bag│   │
│ │   Category: Cement | Specs: 32.5N strength class               │   │
│ │                                                                 │   │
│ │ ● Cement OPC 42.5N (MAT-CEM-001)              bags @ $12.50/bag│   │
│ │   Category: Cement | Specs: 42.5N strength class               │   │
│ │   ✓ Currently in stock | 5 suppliers available                 │   │
│ │                                                                 │   │
│ │ ○ Cement OPC 52.5N (MAT-CEM-004)              bags @ $13.75/bag│   │
│ │   Category: Cement | Specs: 52.5N rapid strength              │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Step 2: Define Quantity Factor                                         │
│                                                                         │
│ Selected: Cement OPC 42.5N (MAT-CEM-001)                              │
│ Unit Price: $12.50 per bag                                            │
│                                                                         │
│ Quantity per m³: [7.0_____] bags                                      │
│ Wastage %: [5_____] % (Standard: 5%)                                  │
│                                                                         │
│ ☐ Mark as primary material                                            │
│ ☐ This is a variable quantity (depends on conditions)                 │
│                                                                         │
│ Calculation Preview:                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ Base: 7.0 bags × $12.50 = $87.50                               │   │
│ │ With 5% wastage: 7.35 bags × $12.50 = $91.88                   │   │
│ │ Cost per m³: $91.88                                             │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Notes: [_________________________________________________]            │
│        [_________________________________________________]            │
│                                                                         │
│ [Add to Factors] [Add & Continue] [Cancel]                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Labor Factors Tab

```
╔═══════════════════════════════════════════════════════════════════════╗
║ 👷 Labor Factors                                                      ║
╟───────────────────────────────────────────────────────────────────────╢
║                                                                       ║
║ [+ Add Labor Type] [Apply Crew Template] [Import Standard Crew]      ║
║                                                                       ║
║ Current Labor Requirements:                                           ║
║ ┌─────────────────────────────────────────────────────────────┐     ║
║ │ Job Title           Code    Skill    Hrs/m³  Crew  Rate  Cost│     ║
║ ├─────────────────────────────────────────────────────────────┤     ║
║ │ Mason - Skilled     LAB-001 Skilled  1.6     1     $25   $40 │     ║
║ │   Shift: Normal | Productivity: 100%                       │     ║
║ │   [✏️ Edit] [👥 Adjust Crew] [🗑️ Remove]                   │     ║
║ │                                                             │     ║
║ │ Helper - Unskilled  LAB-002 Unskilled 3.2    2     $15   $96 │     ║
║ │   Shift: Normal | Productivity: 100%                       │     ║
║ │   Note: 2 helpers working simultaneously                   │     ║
║ │   [✏️ Edit] [👥 Adjust Crew] [🗑️ Remove]                   │     ║
║ │                                                             │     ║
║ │ Foreman            LAB-003 Supervisor 0.3    1     $35  $10.50│     ║
║ │   Shift: Normal | Productivity: 100%                       │     ║
║ │   Note: Supervisory oversight                              │     ║
║ │   [✏️ Edit] [👥 Adjust Crew] [🗑️ Remove]                   │     ║
║ └─────────────────────────────────────────────────────────────┘     ║
║                                                                       ║
║ Labor Summary:                                                        ║
║ • Total Hours per m³: 5.1 hours (7.4 man-hours with crew)           ║
║ • Total Labor Cost per m³: $146.50                                   ║
║ • Crew Size: 4 workers (1 skilled + 2 helpers + 1 foreman)          ║
║                                                                       ║
║ Productivity Adjustments:                                             ║
║ [Standard ▼] Apply factor: 1.0                                       ║
║ Options: Easy (0.9) | Standard (1.0) | Difficult (1.2) | Custom     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Equipment Factors Tab

```
╔═══════════════════════════════════════════════════════════════════════╗
║ 🚜 Equipment Factors                                                  ║
╟───────────────────────────────────────────────────────────────────────╢
║                                                                       ║
║ [+ Add Equipment] [Equipment Sets] [Calculate Fuel Costs]            ║
║                                                                       ║
║ Current Equipment Requirements:                                       ║
║ ┌─────────────────────────────────────────────────────────────┐     ║
║ │ Equipment         Code     Type      Hrs/m³  Rate    Cost   │     ║
║ ├─────────────────────────────────────────────────────────────┤     ║
║ │ Concrete Mixer    EQP-001  Mixer     0.30    $45     $13.50 │     ║
║ │   Capacity: 0.5m³ | Fuel: Diesel                           │     ║
║ │   ☑ Include fuel ($3/hr) | ☐ Include operator             │     ║
║ │   [✏️ Edit] [⚙️ Settings] [🗑️ Remove]                      │     ║
║ │                                                             │     ║
║ │ Poker Vibrator    EQP-002  Vibrator  0.15    $15     $2.25  │     ║
║ │   Type: 40mm diameter | Power: Electric                    │     ║
║ │   ☐ Include fuel | ☐ Include operator                     │     ║
║ │   [✏️ Edit] [⚙️ Settings] [🗑️ Remove]                      │     ║
║ │                                                             │     ║
║ │ Wheelbarrows      EQP-003  Transport 0.40    $8      $3.20  │     ║
║ │   Quantity: 2 units | Type: Manual                         │     ║
║ │   Note: For material transport on site                     │     ║
║ │   [✏️ Edit] [⚙️ Settings] [🗑️ Remove]                      │     ║
║ └─────────────────────────────────────────────────────────────┘     ║
║                                                                       ║
║ Equipment Summary:                                                    ║
║ • Total Equipment Hours per m³: 0.85 hours                          ║
║ • Total Equipment Cost per m³: $18.95                               ║
║ • Additional Costs: Fuel included in hourly rates                   ║
║                                                                       ║
║ ☐ Include mobilization/demobilization costs                         ║
║ ☐ Apply efficiency factor for site conditions                       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

### Summary Tab (Complete Cost Breakdown)

```
╔═══════════════════════════════════════════════════════════════════════╗
║ 📊 LME Factor Summary                                                 ║
╟───────────────────────────────────────────────────────────────────────╢
║                                                                       ║
║ Item: Concrete Grade 25 strip foundation (02.10.10.04)              ║
║ Unit: m³                                                              ║
║                                                                       ║
║ Cost Breakdown per Unit:                                              ║
║ ┌─────────────────────────────────────────────────────────────┐     ║
║ │ Component          Items    Base Cost   With Factors  Final │     ║
║ ├─────────────────────────────────────────────────────────────┤     ║
║ │ 📦 Materials         5      $170.15     +5% waste    $178.65│     ║
║ │ 👷 Labor            3      $146.50     Standard      $146.50│     ║
║ │ 🚜 Equipment        3      $18.95      Inc. fuel     $18.95 │     ║
║ │ ─────────────────────────────────────────────────────────── │     ║
║ │ Subtotal                   $335.60                   $344.10│     ║
║ │ Overhead (2%)              $6.71                     $6.88  │     ║
║ │ ─────────────────────────────────────────────────────────── │     ║
║ │ Total Cost per m³          $342.31                   $350.98│     ║
║ └─────────────────────────────────────────────────────────────┘     ║
║                                                                       ║
║ Resource Requirements Summary:                                        ║
║ • Materials: 5 different types with 5% average wastage              ║
║ • Labor: 5.1 work hours (7.4 man-hours with crew)                  ║
║ • Equipment: 0.85 equipment hours                                    ║
║                                                                       ║
║ Validation Status: ✅ All factors validated                          ║
║ Last Updated: 2024-01-15 14:30 by John Smith                       ║
║                                                                       ║
║ [Export to PDF] [Print Summary] [Share Link] [View in Estimate]     ║
╚═══════════════════════════════════════════════════════════════════════╝
```

---

## Using Library Items in Estimates

### Creating an Estimate

**Page: /estimates/new**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 New Estimate                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Project Details:                                                        │
│ Project Name: [Riverside Commercial Complex_______________]            │
│ Client: [ABC Development Corp.___________________________]            │
│ Location: [Downtown Riverside____________________________]            │
│ Start Date: [01/03/2024] End Date: [31/12/2024]                      │
│                                                                         │
│ [Save & Continue to Items]                                [Cancel]    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Adding Library Items to Estimate

**Page: /estimates/{id}/items**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 Estimate: Riverside Commercial Complex                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ [+ Add from Library] [+ Custom Item] [Import BOQ] [🔍 Search items]   │
│                                                                         │
│ Current Estimate Items:                                                │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ # Code         Description              Qty    Unit   Total Cost │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │ 1 02.10.10.04  Concrete Grade 25 strip  100    m³     $35,100   │   │
│ │                foundation                                         │   │
│ │   📦 Materials: $17,865 | 👷 Labor: $14,650 | 🚜 Equip: $2,585  │   │
│ │   [View Details] [Edit Qty] [Override Rates] [Remove]           │   │
│ │                                                                  │   │
│ │ 2 02.10.20.03  Reinforcement Y16        2,500  kg     $3,125    │   │
│ │   📦 Materials: $2,300 | 👷 Labor: $750 | 🚜 Equip: $75         │   │
│ │   [View Details] [Edit Qty] [Override Rates] [Remove]           │   │
│ │                                                                  │   │
│ │ 3 02.10.30.01  Formwork to foundations  450    m²     $11,250   │   │
│ │   📦 Materials: $4,500 | 👷 Labor: $5,850 | 🚜 Equip: $900      │   │
│ │   [View Details] [Edit Qty] [Override Rates] [Remove]           │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Estimate Summary:                                                       │
│ Total Materials: $24,665 | Total Labor: $21,250 | Total Equip: $3,560 │
│ Grand Total: $49,475                                                   │
│                                                                         │
│ [Generate Reports] [Export to Excel] [Create PO] [Submit for Approval] │
└─────────────────────────────────────────────────────────────────────────┘
```

### Library Item Selection Modal

**Modal: Add Items from Library**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📚 Select Library Items                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Browse: [By Category] [By Trade] [Favorites] [Recent]                 │
│ Search: [🔍 Search by name, code, or keyword...]                      │
│                                                                         │
│ Category: 02. Substructure > 02.10 Foundations                        │
│                                                                         │
│ Available Items:                                                        │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ ☐ 02.10.10.01  Concrete Grade 20 footings         m³    $320/m³│   │
│ │ ☐ 02.10.10.02  Concrete Grade 25 footings         m³    $340/m³│   │
│ │ ☑ 02.10.10.04  Concrete Grade 25 strip foundation m³    $351/m³│   │
│ │ ☐ 02.10.10.05  Concrete Grade 30 strip foundation m³    $375/m³│   │
│ │ ☑ 02.10.20.03  Reinforcement Y16                  kg    $1.25/kg│   │
│ │ ☑ 02.10.30.01  Formwork to foundations            m²    $25/m² │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ Selected Items (3):                                                     │
│ • Concrete Grade 25 strip foundation                                   │
│ • Reinforcement Y16                                                    │
│ • Formwork to foundations                                              │
│                                                                         │
│ [Add Selected Items] [Select All] [Clear] [Cancel]                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Item Detail View in Estimate

**Modal: Item Details - Concrete Grade 25**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📋 Estimate Item Details                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Item: 02.10.10.04 - Concrete Grade 25 strip foundation                │
│ Quantity: 100 m³ | Location: Foundation Grid A-E                      │
│                                                                         │
│ Tabs: [📦 Materials] [👷 Labor] [🚜 Equipment] [💰 Cost Summary]       │
│                                                                         │
│ ╔═══════════════════════════════════════════════════════════════════╗ │
│ ║ 📦 Material Requirements (for 100 m³)                             ║ │
│ ╟───────────────────────────────────────────────────────────────────╢ │
│ ║                                                                   ║ │
│ ║ Material              Required    Delivered  Used   Stock   Cost ║ │
│ ║ ─────────────────────────────────────────────────────────────── ║ │
│ ║ Cement OPC 42.5N      735 bags    0         0      0      $9,188║ │
│ ║ Sand (Fine)           44.1 m³     0         0      0      $1,985║ │
│ ║ Aggregate 20mm        87.15 m³    0         0      0      $4,793║ │
│ ║ Water                 17,500 L    0         0      0      $875  ║ │
│ ║ Plasticizer          210 L       0         0      0      $1,785║ │
│ ║ ─────────────────────────────────────────────────────────────── ║ │
│ ║ Total Materials                                           $18,626║ │
│ ║                                                                   ║ │
│ ║ Notes:                                                            ║ │
│ ║ • Quantities include 5% wastage factor                           ║ │
│ ║ • Prices current as of 2024-01-15                               ║ │
│ ║ • Click material name to view specifications                     ║ │
│ ║                                                                   ║ │
│ ║ [Create Purchase Order] [Update Prices] [Export List]            ║ │
│ ╚═══════════════════════════════════════════════════════════════════╝ │
│                                                                         │
│ [Save Changes] [Generate Work Order] [Back to Estimate]               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Reports & Analytics

### LME Analytics Dashboard

**Page: /analytics/lme**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 LME Analytics Dashboard                                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Period: [Last 30 Days ▼] Project: [All Projects ▼]                    │
│                                                                         │
│ ┌─────────────────────────┬─────────────────────────────────────────┐ │
│ │ 📦 Material Usage       │ 👷 Labor Utilization                    │ │
│ ├─────────────────────────┼─────────────────────────────────────────┤ │
│ │ Top 5 Materials:        │ By Trade:                               │ │
│ │ 1. Cement: 2,450 bags   │ • Masonry: 3,200 hrs (45%)             │ │
│ │ 2. Rebar: 15,300 kg     │ • Electrical: 1,800 hrs (25%)          │ │
│ │ 3. Sand: 185 m³         │ • Plumbing: 1,100 hrs (15%)            │ │
│ │ 4. Concrete: 520 m³     │ • Carpentry: 750 hrs (11%)             │ │
│ │ 5. Blocks: 8,500 pcs    │ • Others: 280 hrs (4%)                 │ │
│ │                         │                                         │ │
│ │ [View Full Report]      │ Total: 7,130 hours                      │ │
│ └─────────────────────────┴─────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐   │
│ │ 💰 Cost Analysis by Category                                    │   │
│ ├─────────────────────────────────────────────────────────────────┤   │
│ │                                                                  │   │
│ │ Materials:  $245,680 ████████████████████░░░░░ 58%            │   │
│ │ Labor:      $142,300 ████████████░░░░░░░░░░░░ 34%            │   │
│ │ Equipment:  $33,750  ███░░░░░░░░░░░░░░░░░░░░░ 8%             │   │
│ │                                                                  │   │
│ │ Total: $421,730                                                 │   │
│ └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ [Generate Custom Report] [Export Data] [Schedule Reports]              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Price Trend Analysis

**Page: /analytics/price-trends**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📈 Material Price Trends                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Material: [Cement OPC 42.5N ▼] Period: [Last 12 Months ▼]            │
│                                                                         │
│ Price History Graph:                                                    │
│ $14 ┤                                                      ╱─────     │
│ $13 ┤                                              ╱───────          │
│ $12 ┤                                      ╱───────                  │
│ $11 ┤──────────────────────────────────────                          │
│ $10 ┤                                                                │
│     └─────────────────────────────────────────────────────────────    │
│     Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec       │
│                                                                         │
│ Statistics:                                                             │
│ • Current Price: $12.50 per bag                                        │
│ • 12-Month Change: +13.6% ($1.50)                                     │
│ • Average Price: $11.75                                                │
│ • Price Volatility: Low                                                │
│                                                                         │
│ Price Alerts:                                                           │
│ ⚠️ Price increased 8% in last 90 days                                  │
│ 📊 Above 12-month average by 6.4%                                      │
│                                                                         │
│ [Set Price Alert] [Compare Materials] [Export Chart]                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Setting Up a New Construction Item

1. **Navigate to Library**
   - Go to /library
   - Select appropriate category (e.g., "02. Substructure")
   
2. **Create Level 3 Item**
   - Click "+ Create Item"
   - Enter basic information (code, name, unit, description)
   - Save item

3. **Add Material Factors**
   - Open item details
   - Go to Materials tab
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
   - Configure additional costs (fuel, operator)

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
   - Select catalog type (materials/labor/equipment)

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

### For Estimators
- **Speed**: Create detailed estimates in minutes
- **Accuracy**: No manual calculations needed
- **Consistency**: Same factors used across all projects

### For Project Managers
- **Visibility**: See all resource requirements instantly
- **Planning**: Accurate material and labor schedules
- **Control**: Track actual vs. estimated usage

### For Management
- **Standardization**: Company-wide consistency
- **Analytics**: Deep insights into costs and usage
- **Competitiveness**: Faster, more accurate bidding

### For Procurement
- **Efficiency**: Consolidated material requirements
- **Negotiation**: Volume-based pricing power
- **Tracking**: Complete purchase history

This comprehensive system transforms estimation from a manual, error-prone process into an automated, accurate, and insightful business tool that drives efficiency and profitability.