import { Database } from './supabase';

type DatabaseEstimateItem = Database['public']['Tables']['estimate_items']['Row'];

export interface EstimateItemWithChildren extends Omit<DatabaseEstimateItem, 'index'> {
  children?: EstimateItemWithChildren[];
  isExpanded?: boolean;
  material?: number | null;
  labour?: number | null;
  equipment?: number | null;
  overheads?: number | null;
  profit?: number | null;
  vat?: number | null;
  index?: string;
}

/**
 * Types for the three-table estimate structure
 */

// Level 0 - Structures (e.g., Main House)
export interface EstimateStructure {
  id: string;
  name: string;
  amount: number;
  order_index: number;
  project_id: string;
  created_at: string;
  updated_at: string;
}

// Level 1 - Elements (e.g., Substructure, RC Frame)
export interface EstimateElement {
  id: string;
  name: string;
  amount: number;
  order_index: number;
  structure_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

// Level 2 - Detail Items (e.g., Excavation, Concrete)
export interface EstimateDetailItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number; // Computed in the database as quantity * rate
  order_index: number;
  element_id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

// Types for UI tree representation
export interface EstimateTreeNode {
  id: string;
  name: string;
  amount: number;
  level: 0 | 1 | 2;
  children: EstimateTreeNode[];
  parent_id?: string | null;
}

export interface Level0Node extends EstimateTreeNode {
  level: 0;
  children: Level1Node[];
}

export interface Level1Node extends EstimateTreeNode {
  level: 1;
  structure_id: string;
  children: Level2Node[];
}

export interface Level2Node extends EstimateTreeNode {
  level: 2;
  element_id: string;
  quantity: number;
  unit: string;
  rate: number;
  children: never[];
}

// Legacy compatibility type
export interface LegacyEstimateItem {
  id: string;
  name: string;
  level: number;
  parent_id: string | null;
  order: number;
  amount: number;
  project_id: string;
  created_at: string;
  updated_at: string;
  quantity: number | null;
  unit: string | null;
  rate?: number | null;
  unit_cost?: number | null;
} 