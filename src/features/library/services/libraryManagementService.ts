/**
 * Phase 2: Library Management Service
 * Complete lifecycle management for library items with draft/confirmed/actual workflow
 */

import { createClient } from '@/shared/lib/supabase/client';
import { 
  LibraryItem, 
  LibraryItemStatus, 
  LibraryItemDraft,
  BulkOperation,
  LibraryItemVersion,
  LibraryManagementFilter,
  LibraryManagementSearchParams,
  LibraryManagementSearchResult,
  LibraryManagementValidation,
  LibraryItemStatistics,
  CloneRequest,
  BatchCloneRequest,
  VersionComparison,
  QuickAddFromEstimateData,
  CreateLibraryItemRequest
} from '../types/library';

export class LibraryManagementService {
  private static instance: LibraryManagementService;
  private supabase: any;

  private constructor() {
    this.supabase = createClient();
  }

  static getInstance(): LibraryManagementService {
    if (!this.instance) {
      this.instance = new LibraryManagementService();
    }
    return this.instance;
  }

  // ==========================================
  // CORE CRUD OPERATIONS
  // ==========================================

  /**
   * Create a new library item (starts as draft)
   */
  async createLibraryItem(draft: CreateLibraryItemRequest): Promise<LibraryItem> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Auto-generate code if not provided
    const code = draft.code || await this.generateItemCode(draft.assemblyId);

    const { data, error } = await this.supabase
      .from('library_items')
      .insert({
        code,
        name: draft.name,
        description: draft.description || '',
        unit: draft.unit,
        specifications: draft.specifications || '',
        wastagePercentage: draft.wastagePercentage || 0,
        productivityNotes: draft.productivityNotes || '',
        assembly_id: draft.assemblyId || draft.assemblyCode,
        status: 'draft',
        version: 1,
        isActive: false,
        created_by: user.id
      })
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return this.transformDatabaseItem(data);
  }

  /**
   * Update library item with version tracking
   */
  async updateLibraryItem(
    itemId: string,
    updates: Partial<LibraryItem>
  ): Promise<LibraryItem> {
    // Create version snapshot before update
    await this.createVersionSnapshot(itemId);

    const { data, error } = await this.supabase
      .from('library_items')
      .update({
        ...updates,
        lastModified: new Date().toISOString()
      })
      .eq('id', itemId)
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return this.transformDatabaseItem(data);
  }

  /**
   * Get library item by ID
   */
  async getLibraryItem(itemId: string): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .select(this.getItemSelectQuery())
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return this.transformDatabaseItem(data);
  }

  /**
   * Delete library item (soft delete)
   */
  async deleteLibraryItem(itemId: string, reason?: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await this.supabase
      .from('library_items')
      .update({ 
        isActive: false,
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        deletion_reason: reason
      })
      .eq('id', itemId);

    if (error) throw error;
  }

  /**
   * Restore deleted item
   */
  async restoreLibraryItem(itemId: string): Promise<LibraryItem> {
    const { data, error } = await this.supabase
      .from('library_items')
      .update({ 
        isActive: true,
        deleted_at: null,
        deleted_by: null,
        deletion_reason: null
      })
      .eq('id', itemId)
      .select(this.getItemSelectQuery())
      .single();

    if (error) throw error;
    return this.transformDatabaseItem(data);
  }

  // ==========================================
  // LIFECYCLE MANAGEMENT
  // ==========================================

  /**
   * Confirm library item (Draft → Confirmed)
   */
  async confirmLibraryItem(itemId: string, notes?: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'draft') {
      throw new Error('Only draft items can be confirmed');
    }

    // Validate item has all required factors
    const validation = await this.validateLibraryItem(itemId);
    if (!validation.isValid) {
      throw new Error(`Item validation failed: ${validation.errors.join(', ')}`);
    }

    const { data: { user } } = await this.supabase.auth.getUser();

    return await this.updateLibraryItem(itemId, {
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: user?.id,
      isActive: true,
      productivityNotes: notes ? `${item.productivityNotes || ''}\nConfirmation notes: ${notes}` : item.productivityNotes
    });
  }

  /**
   * Mark item as actual (Confirmed → Actual)
   */
  async markAsActual(itemId: string, notes?: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);
    
    if (item.status !== 'confirmed') {
      throw new Error('Only confirmed items can be marked as actual');
    }

    return await this.updateLibraryItem(itemId, {
      status: 'actual',
      actualLibraryDate: new Date().toISOString(),
      productivityNotes: notes ? `${item.productivityNotes || ''}\nActual library notes: ${notes}` : item.productivityNotes
    });
  }

  /**
   * Revert to draft status
   */
  async revertToDraft(itemId: string, reason?: string): Promise<LibraryItem> {
    const item = await this.getLibraryItem(itemId);

    return await this.updateLibraryItem(itemId, {
      status: 'draft',
      isActive: false,
      confirmedAt: null,
      confirmedBy: null,
      actualLibraryDate: null,
      productivityNotes: reason ? `${item.productivityNotes || ''}\nReverted to draft: ${reason}` : item.productivityNotes
    });
  }

  // ==========================================
  // BULK OPERATIONS
  // ==========================================

  /**
   * Bulk update status
   */
  async bulkUpdateStatus(
    itemIds: string[],
    status: LibraryItemStatus,
    notes?: string
  ): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: [],
      details: {}
    };

    for (const itemId of itemIds) {
      try {
        if (status === 'confirmed') {
          await this.confirmLibraryItem(itemId, notes);
        } else if (status === 'actual') {
          await this.markAsActual(itemId, notes);
        } else if (status === 'draft') {
          await this.revertToDraft(itemId, notes);
        }
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    results.details = {
      [status]: results.successful
    };

    return results;
  }

  /**
   * Bulk delete
   */
  async bulkDelete(itemIds: string[], reason?: string): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        await this.deleteLibraryItem(itemId, reason);
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Bulk restore
   */
  async bulkRestore(itemIds: string[]): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const itemId of itemIds) {
      try {
        await this.restoreLibraryItem(itemId);
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Item ${itemId}: ${error.message}`);
      }
    }

    return results;
  }

  // ==========================================
  // CLONING OPERATIONS
  // ==========================================

  /**
   * Clone library item
   */
  async cloneLibraryItem(
    sourceItemId: string,
    newCode: string,
    newName: string,
    modifications?: Partial<LibraryItem>
  ): Promise<LibraryItem> {
    const source = await this.getLibraryItem(sourceItemId);
    
    // Create new item
    const newItem = await this.createLibraryItem({
      code: newCode,
      name: newName,
      description: source.description,
      unit: source.unit,
      specifications: source.specifications,
      wastagePercentage: source.wastagePercentage,
      productivityNotes: `Cloned from ${source.code} - ${source.name}`,
      assemblyId: source.assembly_id,
      ...modifications
    });

    // Clone factors
    await this.cloneFactors(sourceItemId, newItem.id);

    return newItem;
  }

  /**
   * Batch clone items
   */
  async batchCloneItems(requests: CloneRequest[]): Promise<BulkOperation> {
    const results: BulkOperation = {
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const request of requests) {
      try {
        await this.cloneLibraryItem(
          request.sourceId,
          request.newCode,
          request.newName,
          request.modifications
        );
        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(
          `Clone ${request.sourceId} → ${request.newCode}: ${error.message}`
        );
      }
    }

    return results;
  }

  // ==========================================
  // VERSION CONTROL
  // ==========================================

  /**
   * Create version snapshot
   */
  async createVersionSnapshot(itemId: string, changeNote?: string): Promise<void> {
    const item = await this.getLibraryItem(itemId);
    const { data: { user } } = await this.supabase.auth.getUser();
    
    const { error } = await this.supabase
      .from('library_item_versions')
      .insert({
        library_item_id: itemId,
        version_number: item.version || 1,
        data: item,
        change_note: changeNote,
        created_by: user?.id,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to create version snapshot:', error);
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(itemId: string): Promise<LibraryItemVersion[]> {
    const { data, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('library_item_id', itemId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Restore from version
   */
  async restoreFromVersion(itemId: string, versionId: string): Promise<LibraryItem> {
    const { data: version, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;

    const restoredData = version.data;
    
    // Remove fields that shouldn't be restored
    delete restoredData.id;
    delete restoredData.createdAt;
    delete restoredData.lastModified;
    delete restoredData.version;

    // Create version snapshot before restore
    await this.createVersionSnapshot(itemId, `Restored from version ${version.version_number}`);

    return await this.updateLibraryItem(itemId, restoredData);
  }

  /**
   * Compare versions
   */
  async compareVersions(
    itemId: string,
    versionId1: string,
    versionId2: string
  ): Promise<VersionComparison> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2)
    ]);

    const differences = this.findDifferences(version1.data, version2.data);

    return { version1, version2, differences };
  }

  // ==========================================
  // SEARCH AND FILTERING
  // ==========================================

  /**
   * Search library items with advanced filtering
   */
  async searchLibraryItems(
    params: LibraryManagementSearchParams
  ): Promise<LibraryManagementSearchResult> {
    let query = this.supabase
      .from('library_items')
      .select(this.getItemSelectQuery(), { count: 'exact' });

    // Apply filters
    if (params.query) {
      query = query.or(`code.ilike.%${params.query}%,name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
    }
    
    if (params.status) {
      query = query.eq('status', params.status);
    }
    
    if (params.assemblyId) {
      query = query.eq('assembly_id', params.assemblyId);
    }
    
    if (params.isActive !== undefined) {
      query = query.eq('isActive', params.isActive);
    }
    
    if (params.showDeleted === false) {
      query = query.is('deleted_at', null);
    }
    
    if (params.createdBy) {
      query = query.eq('created_by', params.createdBy);
    }
    
    if (params.dateFrom) {
      query = query.gte('createdAt', params.dateFrom);
    }
    
    if (params.dateTo) {
      query = query.lte('createdAt', params.dateTo);
    }

    // Apply sorting
    const sortBy = params.sortBy || 'createdAt';
    const sortOrder = params.sortOrder || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const items = (data || []).map(item => this.transformDatabaseItem(item));

    return {
      items,
      total: count || 0,
      hasMore: params.limit ? (params.offset || 0) + items.length < (count || 0) : false
    };
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  /**
   * Validate library item for status transitions
   */
  async validateLibraryItem(itemId: string): Promise<LibraryManagementValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic fields
    const item = await this.getLibraryItem(itemId);
    
    if (!item.code || item.code.trim() === '') {
      errors.push('Item code is required');
    }
    if (!item.name || item.name.trim() === '') {
      errors.push('Item name is required');
    }
    if (!item.unit || item.unit.trim() === '') {
      errors.push('Item unit is required');
    }
    if (!item.assembly_id) {
      errors.push('Assembly assignment is required');
    }

    // Check if item has at least one factor
    const hasFactors = await this.checkItemHasFactors(itemId);
    if (!hasFactors) {
      errors.push('Item must have at least one factor (material, labour, or equipment)');
    }

    // Check for duplicate codes
    if (item.code) {
      const duplicates = await this.checkCodeDuplicate(item.code, itemId);
      if (duplicates > 0) {
        errors.push('Item code already exists');
      }
    }

    // Warnings for best practices
    if (!item.description || item.description.trim() === '') {
      warnings.push('Description is recommended for better item identification');
    }
    if (!item.specifications || item.specifications.trim() === '') {
      warnings.push('Specifications help with accurate estimating');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      requiredFields: ['code', 'name', 'unit', 'assembly_id'],
      missingFactors: hasFactors ? [] : ['At least one factor type required']
    };
  }

  // ==========================================
  // STATISTICS
  // ==========================================

  /**
   * Get item usage statistics
   */
  async getItemStatistics(itemId: string): Promise<LibraryItemStatistics> {
    const { data, error } = await this.supabase
      .rpc('get_library_item_statistics', { p_item_id: itemId });

    if (error) {
      console.error('Failed to get statistics:', error);
      return {
        usageCount: 0,
        projectsUsedIn: 0,
        averageQuantity: 0
      };
    }

    return {
      usageCount: data?.usage_count || 0,
      lastUsedAt: data?.last_used_at ? new Date(data.last_used_at) : undefined,
      projectsUsedIn: data?.projects_used_in || 0,
      averageQuantity: data?.average_quantity || 0
    };
  }

  // ==========================================
  // QUICK ADD FROM ESTIMATE
  // ==========================================

  /**
   * Quick add item from estimate context
   */
  async quickAddFromEstimate(data: QuickAddFromEstimateData): Promise<LibraryItem> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Determine assembly_id from hierarchy
    let assemblyId = data.assembly_id;
    if (!assemblyId && data.section_id) {
      // Find first assembly in section
      const { data: assemblies } = await this.supabase
        .from('assemblies')
        .select('id')
        .eq('section_id', data.section_id)
        .limit(1);
      
      assemblyId = assemblies?.[0]?.id;
    }
    if (!assemblyId && data.division_id) {
      // Find first assembly in division
      const { data: assemblies } = await this.supabase
        .from('assemblies')
        .select('id')
        .eq('section.division_id', data.division_id)
        .limit(1);
      
      assemblyId = assemblies?.[0]?.id;
    }

    if (!assemblyId) {
      throw new Error('Could not determine assembly for quick add item');
    }

    // Create the item
    const newItem = await this.createLibraryItem({
      name: data.name,
      unit: data.unit,
      assemblyId,
      description: `Quick-added from estimate search: "${data.quick_add_context.search_term}"`,
      productivityNotes: 'Created via quick-add from estimate. Requires review and factor assignment.'
    });

    // Add basic factors if rates provided
    if (data.material_rate) {
      await this.addQuickMaterialFactor(newItem.id, parseFloat(data.material_rate));
    }
    if (data.labour_rate) {
      await this.addQuickLabourFactor(newItem.id, parseFloat(data.labour_rate));
    }
    if (data.equipment_rate) {
      await this.addQuickEquipmentFactor(newItem.id, parseFloat(data.equipment_rate));
    }

    // Link to estimate element if provided
    if (data.quick_add_context.element_id) {
      await this.linkToEstimateElement(newItem.id, data.quick_add_context.element_id);
    }

    return newItem;
  }

  // ==========================================
  // PRIVATE HELPER METHODS
  // ==========================================

  private getItemSelectQuery(): string {
    return `
      *,
      assembly:assemblies(
        *,
        section:sections(
          *,
          division:divisions(*)
        )
      )
    `;
  }

  private transformDatabaseItem(dbItem: any): LibraryItem {
    return {
      id: dbItem.id,
      code: dbItem.code,
      name: dbItem.name,
      description: dbItem.description || '',
      unit: dbItem.unit,
      specifications: dbItem.specifications || '',
      wastagePercentage: dbItem.wastagePercentage || 0,
      productivityNotes: dbItem.productivityNotes || '',
      materials: [], // Loaded separately when needed
      labor: [], // Loaded separately when needed
      equipment: [], // Loaded separately when needed
      status: dbItem.status as LibraryItemStatus,
      validation: {
        hasMaterials: false, // Computed when needed
        hasLabor: false,
        hasEquipment: false,
        isComplete: dbItem.status === 'confirmed' || dbItem.status === 'actual',
        missingFactors: [],
        lastValidated: dbItem.lastModified || dbItem.createdAt,
        validatedBy: dbItem.confirmedBy
      },
      createdAt: dbItem.createdAt,
      lastModified: dbItem.lastModified || dbItem.createdAt,
      confirmedAt: dbItem.confirmedAt,
      confirmedBy: dbItem.confirmedBy,
      actualLibraryDate: dbItem.actualLibraryDate,
      isActive: dbItem.isActive,
      assembly_id: dbItem.assembly_id,
      version: dbItem.version || 1
    };
  }

  private async generateItemCode(assemblyId?: string): Promise<string> {
    if (!assemblyId) {
      // Generate simple sequential code
      const { data } = await this.supabase
        .from('library_items')
        .select('code')
        .order('code', { ascending: false })
        .limit(1);
      
      const lastCode = data?.[0]?.code;
      if (lastCode && /^\d+$/.test(lastCode)) {
        return String(parseInt(lastCode) + 1).padStart(4, '0');
      }
      return '0001';
    }

    // Generate hierarchical code based on assembly
    const { data: assembly } = await this.supabase
      .from('assemblies')
      .select(`
        code,
        section:sections(
          code,
          division:divisions(code)
        )
      `)
      .eq('id', assemblyId)
      .single();

    if (!assembly) {
      throw new Error('Assembly not found');
    }

    const divisionCode = assembly.section?.division?.code || '00';
    const sectionCode = assembly.section?.code || '00';
    const assemblyCode = assembly.code || '00';

    // Find next item number in this assembly
    const { data: items } = await this.supabase
      .from('library_items')
      .select('code')
      .eq('assembly_id', assemblyId)
      .order('code', { ascending: false })
      .limit(1);

    let itemNumber = '01';
    if (items?.[0]?.code) {
      const lastCode = items[0].code;
      const parts = lastCode.split('.');
      if (parts.length === 4) {
        const lastNum = parseInt(parts[3]);
        itemNumber = String(lastNum + 1).padStart(2, '0');
      }
    }

    return `${divisionCode}.${sectionCode}.${assemblyCode}.${itemNumber}`;
  }

  private async getVersion(versionId: string): Promise<LibraryItemVersion> {
    const { data, error } = await this.supabase
      .from('library_item_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) throw error;
    return data;
  }

  private findDifferences(obj1: any, obj2: any): Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }> {
    const differences = [];
    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        differences.push({
          field: key,
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    }

    return differences;
  }

  private async checkItemHasFactors(itemId: string): Promise<boolean> {
    const [materialFactors, labourFactors, equipmentFactors] = await Promise.all([
      this.supabase.from('material_factors').select('id').eq('library_item_id', itemId).limit(1),
      this.supabase.from('labor_factors').select('id').eq('library_item_id', itemId).limit(1),
      this.supabase.from('equipment_factors').select('id').eq('library_item_id', itemId).limit(1)
    ]);

    return (
      (materialFactors.data && materialFactors.data.length > 0) ||
      (labourFactors.data && labourFactors.data.length > 0) ||
      (equipmentFactors.data && equipmentFactors.data.length > 0)
    );
  }

  private async checkCodeDuplicate(code: string, excludeItemId?: string): Promise<number> {
    let query = this.supabase
      .from('library_items')
      .select('id', { count: 'exact' })
      .eq('code', code);

    if (excludeItemId) {
      query = query.neq('id', excludeItemId);
    }

    const { count } = await query;
    return count || 0;
  }

  private async cloneFactors(sourceItemId: string, targetItemId: string): Promise<void> {
    // Clone material factors
    const { data: materialFactors } = await this.supabase
      .from('material_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (materialFactors && materialFactors.length > 0) {
      const clonedMaterials = materialFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        createdAt: undefined,
        updatedAt: undefined
      }));

      await this.supabase.from('material_factors').insert(clonedMaterials);
    }

    // Clone labor factors
    const { data: laborFactors } = await this.supabase
      .from('labor_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (laborFactors && laborFactors.length > 0) {
      const clonedLabor = laborFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        createdAt: undefined,
        updatedAt: undefined
      }));

      await this.supabase.from('labor_factors').insert(clonedLabor);
    }

    // Clone equipment factors
    const { data: equipmentFactors } = await this.supabase
      .from('equipment_factors')
      .select('*')
      .eq('library_item_id', sourceItemId);

    if (equipmentFactors && equipmentFactors.length > 0) {
      const clonedEquipment = equipmentFactors.map(f => ({
        ...f,
        id: undefined,
        library_item_id: targetItemId,
        createdAt: undefined,
        updatedAt: undefined
      }));

      await this.supabase.from('equipment_factors').insert(clonedEquipment);
    }
  }

  private async addQuickMaterialFactor(itemId: string, rate: number): Promise<void> {
    // Add a generic material factor for quick-add items
    await this.supabase.from('material_factors').insert({
      library_item_id: itemId,
      materialCode: 'GENERIC-MAT',
      materialName: 'Generic Material',
      unit: 'unit',
      quantityPerUnit: 1,
      wastagePercentage: 5,
      currentPrice: rate,
      specifications: 'Quick-add generic material - requires specification'
    });
  }

  private async addQuickLabourFactor(itemId: string, rate: number): Promise<void> {
    // Add a generic labor factor for quick-add items
    await this.supabase.from('labor_factors').insert({
      library_item_id: itemId,
      laborCode: 'GENERIC-LAB',
      laborName: 'Generic Labor',
      trade: 'General',
      skillLevel: 'Standard',
      hoursPerUnit: 1,
      currentRate: rate,
      qualifications: 'Quick-add generic labor - requires specification'
    });
  }

  private async addQuickEquipmentFactor(itemId: string, rate: number): Promise<void> {
    // Add a generic equipment factor for quick-add items
    await this.supabase.from('equipment_factors').insert({
      library_item_id: itemId,
      equipmentCode: 'GENERIC-EQP',
      equipmentName: 'Generic Equipment',
      category: 'General',
      hoursPerUnit: 1,
      currentRate: rate,
      specifications: 'Quick-add generic equipment - requires specification'
    });
  }

  private async linkToEstimateElement(itemId: string, elementId: string): Promise<void> {
    // Link the new library item to the estimate element
    await this.supabase.from('estimate_element_items').insert({
      element_id: elementId,
      library_item_id: itemId,
      quantity: 1,
      quick_add: true
    });
  }
}