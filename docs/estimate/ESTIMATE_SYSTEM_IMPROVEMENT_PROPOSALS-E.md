
# Estimate System Improvement Proposals

## Overview

This document outlines critical issues and improvement proposals for the estimate system. The analysis is based on a thorough review of the codebase and documentation. Addressing these issues will significantly improve the system's correctness, maintainability, performance, and reliability.

---

## 1. Critical: Fix Hardcoded Cost Breakdowns in the UI

**Issue:** The primary estimate user interface at `src/features/estimates/components/bq/EstimateTab.tsx` uses hardcoded percentages to calculate and display cost breakdowns (e.g., `materialCost = amount * 0.4`). This is a critical flaw that contradicts the factor-based costing engine implemented in the backend (`FactorCalculatorService`). The UI is currently displaying incorrect and misleading data.

**Impact:**
- Users are not seeing the true cost breakdown based on the library factors.
- The core benefit of the new, detailed costing system is completely lost on the frontend.
- There is a major disconnect between the frontend presentation and the backend logic.

**Recommendation:**
1.  **Modify API/Data Layer:** Adjust the data source for the estimate view (`estimate_items_view` and the queries that use it) to include the detailed, factor-based cost breakdown for each item (e.g., `total_material_cost`, `total_labor_cost`, `total_equipment_cost`). This data should be calculated on the backend using the `FactorCalculatorService`.
2.  **Refactor UI Components:** Remove the hardcoded calculation functions (`getMaterialCost`, `getLabourCost`, etc.) from `src/features/estimates/components/bq/EstimateTab.tsx` and the `EstimateRow` component.
3.  **Display Real Data:** Update the components to render the actual cost breakdown data fetched from the backend.

---

## 2. Critical: Add Missing `estimate_items_view` Definition to Version Control

**Issue:** The `estimate_items_view` is used extensively to fetch data for the estimates feature, yet its `CREATE VIEW` definition is not present in any of the SQL migration files in the `supabase/migrations` directory. This strongly implies it was created manually via the Supabase Studio.

**Impact:**
- **Broken Infrastructure-as-Code:** The database schema is not fully defined in code, making it impossible to reliably replicate the development environment.
- **Maintainability Nightmare:** Any changes to the view are not tracked in Git, leading to potential conflicts and making it difficult to understand the evolution of the schema.
- **Onboarding Friction:** New developers cannot set up a local database instance from scratch without manual intervention.

**Recommendation:**
1.  **Retrieve View Definition:** Immediately retrieve the full `CREATE VIEW` statement for `estimate_items_view` from the Supabase Studio.
2.  **Create New Migration:** Create a new migration file in `supabase/migrations/` (e.g., `..._create_estimate_items_view.sql`) and add the view definition to it.
3.  **Enforce Policy:** Mandate that all future database schema changes, including views, are made exclusively through version-controlled migration files.

---

## 3. High: Remove Duplicated `FactorCalculatorService`

**Issue:** The codebase contains two nearly identical files for calculating factor-based costs:
1.  `src/features/estimates/services/factorCalculatorService.ts`
2.  `src/features/estimates/services/client/factorCalculatorService.client.ts`

This is a clear case of code duplication. Both services make direct calls to the Supabase database and have the same core logic.

**Impact:**
- **Increased Maintenance:** Any bug fix or logic change must be applied in two places.
- **Code Confusion:** It's unclear which service should be used and why a separate client version exists.
- **Unnecessary Complexity:** It adds bloat to the codebase without providing any clear benefit.

**Recommendation:**
1.  **Delete Client Service:** Remove the `src/features/estimates/services/client/factorCalculatorService.client.ts` file.
2.  **Centralize Logic:** Use the primary `factorCalculatorService.ts` for all cost calculations.
3.  **Expose via API (if needed):** If there's a need for the client to trigger these calculations (e.g., for a preview before saving), create a dedicated API endpoint that calls the backend service. Do not replicate the calculation logic on the client.

---

## 4. Medium: Remove Legacy `EstimateTab.tsx` Component

**Issue:** The file `src/features/estimates/components/estimate/EstimateTab.tsx` is an outdated or mock-up component. It uses hardcoded `sampleData`, incorrect calculation logic, and is not integrated with the live backend.

**Impact:**
- **Technical Debt:** It clutters the codebase with unused, confusing code.
- **Developer Confusion:** New developers might waste time trying to understand or modify this legacy component.

**Recommendation:**
- Delete the `src/features/estimates/components/estimate/` directory and its contents, primarily `EstimateTab.tsx` and `EstimateItem.tsx`. Ensure no other parts of the application are importing from it before deletion.

---

## 5. Medium: Add Comprehensive Tests for the Estimate Feature

**Issue:** The `src/features/estimates/tests/` directory is empty. The entire estimation feature, which is complex and critical to the application's function, lacks any automated tests.

**Impact:**
- **High Risk of Regressions:** Without tests, any changes to the calculation logic, API, or UI components could easily introduce bugs.
- **Difficult to Refactor:** Improving or refactoring the code is risky without a test suite to validate changes.
- **Unreliable Functionality:** The correctness of the calculations and UI interactions cannot be guaranteed.

**Recommendation:**
1.  **Unit Tests:** Add unit tests for the business logic in `LibraryIntegrationService` and `FactorCalculatorService`. Verify that the calculations are correct for various scenarios.
2.  **Integration Tests:** Write integration tests for the API endpoints, especially for `/api/estimates/library/integrate`.
3.  **Component Tests:** Implement component tests for `src/features/estimates/components/bq/EstimateTab.tsx` using a tool like Vitest or Jest with Testing Library. Mock the API calls and test the UI interactions, state changes, and rendering logic. 