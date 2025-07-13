import { createClient } from '@/shared/lib/supabase/client';
import { FactorCalculatorService } from './factorCalculatorService';
import {
  LibraryItemSelection,
  EstimateCreationResult,
  EstimateCreationError,
  HierarchyMapping,
  LibraryHierarchyNode,
  EstimateElement,
  EstimateDetailItem,
  IntegrationError
} from '../types/libraryIntegration';
import { CacheManager, cacheKeys } from '../utils/cache';

export class LibraryIntegrationService {
  private static instance: LibraryIntegrationService;
  private supabase: any;
  private factorCalculator: FactorCalculatorService;
  private cache: CacheManager;

  private constructor() {
    this.supabase = createClient();
    this.factorCalculator = FactorCalculatorService.getInstance();
    this.cache = CacheManager.getInstance();
  }

  static getInstance(): LibraryIntegrationService {
    if (!this.instance) {
      this.instance = new LibraryIntegrationService();
    }
    return this.instance;
  }

  /**
   * Create estimate elements and detail items from library selections
   */
  async createEstimateFromLibraryItems(
    projectId: string,
    structureId: string,
    selections: LibraryItemSelection[]
  ): Promise<EstimateCreationResult> {
    const errors: EstimateCreationError[] = [];
    const createdElements: EstimateElement[] = [];
    const createdDetailItems: EstimateDetailItem[] = [];

    try {
      // Begin transaction
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Validate selections
      const validSelections = await this.validateSelections(selections);
      if (validSelections.length === 0) {
        throw new Error('No valid library items selected');
      }

      // Create intelligent hierarchy mapping
      const hierarchyMapping = await this.createIntelligentHierarchy(validSelections);

      // Create estimate elements (Division → Section → Assembly)
      const elementMapping = await this.createEstimateElements(
        projectId,
        structureId,
        hierarchyMapping,
        user.id
      );

      // Create detail items with factor calculations
      const detailItems = await this.createDetailItems(
        projectId,
        validSelections,
        elementMapping,
        user.id
      );

      // Track library usage
      await this.trackLibraryUsage(projectId, validSelections, user.id);

      return {
        elements: Object.values(elementMapping),
        detailItems,
        usageRecords: [],
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      console.error('Error creating estimate from library:', error);
      throw error;
    }
  }

  /**
   * Validate library item selections
   */
  private async validateSelections(
    selections: LibraryItemSelection[]
  ): Promise<LibraryItemSelection[]> {
    const validSelections: LibraryItemSelection[] = [];

    for (const selection of selections) {
      // Verify library item exists
      const { data: item, error } = await this.supabase
        .from('library_items')
        .select(`
          *,
          assembly:assemblies!inner(
            *,
            section:sections!inner(
              *,
              division:divisions!inner(*)
            )
          )
        `)
        .eq('id', selection.item.id)
        .single();

      if (!error && item) {
        validSelections.push({
          ...selection,
          item: item
        });
      }
    }

    return validSelections;
  }

  /**
   * Create intelligent hierarchy mapping to minimize duplication
   */
  private async createIntelligentHierarchy(
    selections: LibraryItemSelection[]
  ): Promise<HierarchyMapping> {
    const hierarchy: HierarchyMapping = {
      structure: {} as any,
      element: {} as any,
      divisions: new Map(),
      sections: new Map(),
      assemblies: new Map(),
      divisionElements: new Map(),
      sectionElements: new Map(),
      assemblyElements: new Map()
    };

    for (const selection of selections) {
      const { item } = selection;
      if (!item.assembly) continue;
      const assembly = item.assembly;
      if (!assembly.section) continue;
      const section = assembly.section;
      if (!section.division) continue;
      const division = section.division;

      // Track divisions
      if (!hierarchy.divisions.has(division.id)) {
        hierarchy.divisions.set(division.id, {
          ...division,
          sections: new Set(),
          elementId: null
        });
      }
      hierarchy.divisions.get(division.id)!.sections.add(section.id);

      // Track sections
      if (!hierarchy.sections.has(section.id)) {
        hierarchy.sections.set(section.id, {
          ...section,
          divisionId: division.id,
          assemblies: new Set(),
          elementId: null
        });
      }
      hierarchy.sections.get(section.id)!.assemblies.add(assembly.id);

      // Track assemblies
      if (!hierarchy.assemblies.has(assembly.id)) {
        hierarchy.assemblies.set(assembly.id, {
          ...assembly,
          sectionId: section.id,
          items: [],
          elementId: null
        });
      }
      hierarchy.assemblies.get(assembly.id)!.items.push(selection);
    }

    return hierarchy;
  }

  /**
   * Create estimate elements based on hierarchy mapping
   */
  private async createEstimateElements(
    projectId: string,
    structureId: string,
    hierarchy: HierarchyMapping,
    userId: string
  ): Promise<Record<string, EstimateElement>> {
    const elementMapping: Record<string, EstimateElement> = {};

    // Create Division elements (Level 2)
    for (const [divisionId, divisionData] of hierarchy.divisions) {
      const { data: element, error } = await this.supabase
        .from('estimate_elements')
        .insert({
          project_id: projectId,
          structure_id: structureId,
          name: divisionData.name,
          code: divisionData.code,
          description: divisionData.description,
          hierarchy_level: 2,
          library_division_id: divisionId,
          library_code: divisionData.code,
          library_path: divisionData.code,
          is_from_library: true,
          created_by: userId
        })
        .select()
        .single();

      if (!error && element) {
        divisionData.elementId = element.id;
        elementMapping[`division_${divisionId}`] = element;
      }
    }

    // Create Section elements (Level 3)
    for (const [sectionId, sectionData] of hierarchy.sections) {
      const divisionElement = hierarchy.divisions.get(sectionData.divisionId);
      
      const { data: element, error } = await this.supabase
        .from('estimate_elements')
        .insert({
          project_id: projectId,
          structure_id: structureId,
          parent_element_id: divisionElement?.elementId,
          name: sectionData.name,
          code: sectionData.code,
          description: sectionData.description,
          hierarchy_level: 3,
          library_division_id: sectionData.divisionId,
          library_section_id: sectionId,
          library_code: sectionData.code,
          library_path: `${divisionElement?.code}.${sectionData.code}`,
          is_from_library: true,
          created_by: userId
        })
        .select()
        .single();

      if (!error && element) {
        sectionData.elementId = element.id;
        elementMapping[`section_${sectionId}`] = element;
      }
    }

    // Create Assembly elements (Level 4)
    for (const [assemblyId, assemblyData] of hierarchy.assemblies) {
      const sectionElement = hierarchy.sections.get(assemblyData.sectionId);
      const divisionElement = hierarchy.divisions.get(
        hierarchy.sections.get(assemblyData.sectionId)!.divisionId
      );
      
      const { data: element, error } = await this.supabase
        .from('estimate_elements')
        .insert({
          project_id: projectId,
          structure_id: structureId,
          parent_element_id: sectionElement?.elementId,
          name: assemblyData.name,
          code: assemblyData.code,
          description: assemblyData.description,
          hierarchy_level: 4,
          library_division_id: divisionElement?.id,
          library_section_id: assemblyData.sectionId,
          library_assembly_id: assemblyId,
          library_code: assemblyData.code,
          library_path: `${divisionElement?.code}.${sectionElement?.code}.${assemblyData.code}`,
          is_from_library: true,
          created_by: userId
        })
        .select()
        .single();

      if (!error && element) {
        assemblyData.elementId = element.id;
        elementMapping[`assembly_${assemblyId}`] = element;
      }
    }

    return elementMapping;
  }

  /**
   * Create detail items with factor calculations
   */
  private async createDetailItems(
    projectId: string,
    selections: LibraryItemSelection[],
    elementMapping: Record<string, EstimateElement>,
    userId: string
  ): Promise<EstimateDetailItem[]> {
    const detailItems: EstimateDetailItem[] = [];

    for (const selection of selections) {
      const { item, quantity = 1 } = selection;
      
      // ✅ FIX: Validate nested object structure exists
      if (!item.assembly?.section?.division) {
        console.error(`Invalid library item structure for item ${item.id}: missing assembly, section, or division`);
        continue;
      }
      
      // ✅ FIX: Use nested object structure instead of flat properties
      const assemblyKey = `assembly_${item.assembly.id}`;
      const assemblyElement = elementMapping[assemblyKey];

      if (!assemblyElement) {
        console.error(`Assembly element not found for ${item.assembly.id}`);
        continue;
      }

      try {
        // Calculate costs using Factor Calculator
        const calculation = await this.factorCalculator.calculateItemCost(
          item.id,
          projectId,
          quantity
        );

        // ✅ FIX: Create detail item with correct nested access patterns
        const { data: detailItem, error } = await this.supabase
          .from('estimate_detail_items')
          .insert({
            project_id: projectId,
            element_id: assemblyElement.id,
            name: item.name,
            unit: item.unit,
            quantity: quantity,
            rate: calculation.ratePerUnit,
            amount: calculation.totalCost,
            library_item_id: item.id,
            library_division_id: item.assembly.section.division.id,  // ✅ FIX: Nested access
            library_section_id: item.assembly.section.id,            // ✅ FIX: Nested access
            library_assembly_id: item.assembly.id,                   // ✅ FIX: Nested access
            library_code: item.code,
            library_path: `${item.assembly.section.division.code}.${item.assembly.section.code}.${item.assembly.code}.${item.code}`, // ✅ FIX: Full hierarchy path
            is_from_library: true,
            rate_calculated: calculation.ratePerUnit,
            factor_breakdown: calculation.breakdown,
            order_index: await this.getNextOrderIndex(assemblyElement.id)
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating detail item:', error);
          continue;
        }

        if (detailItem) {
          detailItems.push(detailItem);
        }
      } catch (error) {
        console.error('Error processing library item:', error);
        continue;
      }
    }

    return detailItems;
  }

  /**
   * Get next order index for an element
   */
  private async getNextOrderIndex(elementId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('estimate_detail_items')
      .select('order_index')
      .eq('element_id', elementId)
      .order('order_index', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 1;
    }

    return (data[0].order_index || 0) + 1;
  }

  /**
   * Track library item usage for analytics
   */
  private async trackLibraryUsage(
    projectId: string,
    selections: LibraryItemSelection[],
    userId: string
  ): Promise<void> {
    const usageRecords = selections.map(selection => ({
      project_id: projectId,
      library_item_id: selection.item.id,
      user_id: userId,
      usage_type: 'estimate_creation',
      quantity: selection.quantity || 1,
      created_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('library_usage_tracking')
      .insert(usageRecords);

    if (error) {
      console.error('Error tracking library usage:', error);
    }
  }

  /**
   * Update existing estimate items with library references
   */
  async linkExistingItemsToLibrary(
    projectId: string,
    mappings: Array<{ detailItemId: string; libraryItemId: string }>
  ): Promise<void> {
    for (const mapping of mappings) {
      // Get library item details
      const { data: libraryItem, error: itemError } = await this.supabase
        .from('library_items')
        .select(`
          *,
          assembly:assemblies!inner(
            id,
            code,
            section:sections!inner(
              id,
              code,
              division:divisions!inner(
                id,
                code
              )
            )
          )
        `)
        .eq('id', mapping.libraryItemId)
        .single();

      if (itemError) continue;

      // Calculate new rate
      const calculation = await this.factorCalculator.calculateItemCost(
        mapping.libraryItemId,
        projectId,
        1
      );

      // Update detail item
      await this.supabase
        .from('estimate_detail_items')
        .update({
          library_item_id: mapping.libraryItemId,
          library_division_id: libraryItem.assembly.section.division.id,
          library_section_id: libraryItem.assembly.section.id,
          library_assembly_id: libraryItem.assembly.id,
          library_code: libraryItem.code,
          is_from_library: true,
          rate_calculated: calculation.ratePerUnit,
          factor_breakdown: calculation.breakdown
        })
        .eq('id', mapping.detailItemId);
    }
  }
}