'use client'

import { createClient } from '@/shared/lib/supabase/client'

export interface CatalogItem {
  id: string
  code: string
  name: string
  description: string | null
  category_id: string | null
  default_unit: string | null
  default_supplier_id: string | null
  last_purchase_price: number | null
  average_price: number | null
  min_order_quantity: number
  lead_time_days: number
  keywords: string[] | null
  specifications: Record<string, any>
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
  category?: {
    id: string
    name: string
  } | null
  supplier_items?: {
    supplier_price: number
    supplier: {
      name: string
    }
  }[]
}

export interface CatalogSuggestionOptions {
  costControlItemId: string
  searchTerm?: string
  limit?: number
  projectId?: string
}

export class CatalogService {
  private static instance: CatalogService
  private featureEnabled = true // Default enabled for Phase 3
  private supabase = createClient()
  private debugMode = false

  static getInstance(): CatalogService {
    if (!CatalogService.instance) {
      CatalogService.instance = new CatalogService()
    }
    return CatalogService.instance
  }

  enableFeature(enabled: boolean) {
    this.featureEnabled = enabled
  }

  enableDebugMode(enabled: boolean) {
    this.debugMode = enabled
  }

  private log(message: string, data?: any) {
    if (this.debugMode) {
      console.log(`[CatalogService] ${message}`, data)
    }
  }

  /**
   * Health check for catalog system
   */
  async healthCheck(): Promise<{ 
    healthy: boolean, 
    catalogItems: number, 
    categories: number, 
    error?: string 
  }> {
    try {
      const [itemsResult, categoriesResult] = await Promise.all([
        this.supabase.from('catalog_items').select('id', { count: 'exact', head: true }),
        this.supabase.from('item_categories').select('id', { count: 'exact', head: true })
      ])

      return {
        healthy: true,
        catalogItems: itemsResult.count || 0,
        categories: categoriesResult.count || 0
      }
    } catch (error) {
      return {
        healthy: false,
        catalogItems: 0,
        categories: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get intelligent catalog suggestions based on cost control item and context
   */
  async getCatalogSuggestions({
    costControlItemId,
    searchTerm = '',
    limit = 10,
    projectId
  }: CatalogSuggestionOptions): Promise<CatalogItem[]> {
    if (!this.featureEnabled) {
      this.log('Catalog feature is disabled')
      return []
    }

    this.log('Getting catalog suggestions', { costControlItemId, searchTerm, limit, projectId })

    try {
      const results: CatalogItem[] = []
      
      // Strategy 1: Category-based mapping (most reliable)
      try {
        const categoryMatches = await this.getCategoryBasedSuggestions(costControlItemId, limit)
        results.push(...categoryMatches)
        this.log('Category matches found', categoryMatches.length)
      } catch (err) {
        console.warn('Category-based suggestions failed:', err)
      }
      
      // Strategy 2: Keyword matching (fallback for search terms)
      if (searchTerm && searchTerm.length > 1) {
        try {
          const keywordMatches = await this.getKeywordBasedSuggestions(costControlItemId, searchTerm, limit)
          results.push(...keywordMatches)
          this.log('Keyword matches found', keywordMatches.length)
        } catch (err) {
          console.warn('Keyword-based suggestions failed:', err)
        }
      }
      
      // Strategy 3: Historical usage (future enhancement)
      try {
        const historicalMatches = await this.getHistoricalSuggestions(costControlItemId, projectId, limit)
        results.push(...historicalMatches)
        this.log('Historical matches found', historicalMatches.length)
      } catch (err) {
        console.warn('Historical suggestions failed:', err)
      }
      
      // If no specific suggestions found, return general active items
      if (results.length === 0) {
        try {
          this.log('No specific suggestions found, falling back to general active items')
          const { items: fallbackItems } = await this.getCatalogItems({
            isActive: true,
            limit: Math.min(limit, 5),
            searchQuery: searchTerm
          })
          results.push(...fallbackItems)
        } catch (err) {
          console.warn('Fallback catalog items failed:', err)
        }
      }
      
      // Combine and rank results
      const rankedResults = this.rankSuggestions(results, limit)
      this.log('Final ranked suggestions', rankedResults.length)
      return rankedResults
    } catch (error) {
      console.error('Error getting catalog suggestions:', error)
      return []
    }
  }

  /**
   * Get suggestions based on cost control category mapping
   */
  private async getCategoryBasedSuggestions(costControlItemId: string, limit: number): Promise<CatalogItem[]> {
    try {
      // Get cost control item details
      const { data: costControlItem } = await this.supabase
        .from('cost_control_items')
        .select('name, id')
        .eq('id', costControlItemId)
        .single()

      if (!costControlItem) return []

      // Find matching catalog categories using fuzzy matching
      const { data: mappings } = await this.supabase
        .from('cost_control_catalog_mappings')
        .select('catalog_category_id, match_weight')
        .ilike('cost_control_category', `%${costControlItem.name}%`)

      if (!mappings?.length) {
        // Fallback: try to match by keywords in cost control item name
        return this.getKeywordBasedSuggestions(costControlItemId, costControlItem.name, limit)
      }

      // Get catalog items from matching categories
      const categoryIds = mappings.map(m => m.catalog_category_id).filter(Boolean)
      
      if (categoryIds.length === 0) return []

      const { data: items } = await this.supabase
        .from('catalog_items')
        .select(`
          *,
          category:item_categories(id, name),
          supplier_items:catalog_supplier_items(
            supplier_price,
            supplier:suppliers(name)
          )
        `)
        .in('category_id', categoryIds)
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(limit)

      return items || []
    } catch (error) {
      console.error('Error in category-based suggestions:', error)
      return []
    }
  }

  /**
   * Get suggestions based on keyword search
   */
  private async getKeywordBasedSuggestions(
    _costControlItemId: string,
    searchTerm: string = '',
    limit: number
  ): Promise<CatalogItem[]> {
    if (!searchTerm || searchTerm.length < 2) return []

    try {
      // Split search term into individual keywords
      const keywords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 2)
      
      if (keywords.length === 0) return []

      // Search in name, description, and keywords array
      const { data: items } = await this.supabase
        .from('catalog_items')
        .select(`
          *,
          category:item_categories(id, name),
          supplier_items:catalog_supplier_items(
            supplier_price,
            supplier:suppliers(name)
          )
        `)
        .or(keywords.map(keyword => 
          `name.ilike.%${keyword}%,description.ilike.%${keyword}%,keywords.cs.{${keyword}}`
        ).join(','))
        .eq('is_active', true)
        .order('usage_count', { ascending: false })
        .limit(limit)

      return items || []
    } catch (error) {
      console.error('Error in keyword-based suggestions:', error)
      return []
    }
  }

  /**
   * Get suggestions based on historical usage in similar projects/contexts
   * Currently returns empty array since no historical data exists yet
   */
  private async getHistoricalSuggestions(
    _costControlItemId: string,
    _projectId?: string,
    _limit: number = 5
  ): Promise<CatalogItem[]> {
    try {
      // For now, return empty array since purchase orders don't have catalog_item_id populated yet
      // This will be populated as users start using the catalog suggestions
      return []
      
      /* Future implementation when historical data is available:
      const { data: historicalPOs } = await this.supabase
        .from('purchase_order_items')
        .select(`
          catalog_item:catalog_items(
            *,
            category:item_categories(id, name),
            supplier_items:catalog_supplier_items(
              supplier_price,
              supplier:suppliers(name)
            )
          )
        `)
        .eq('cost_control_item_id', costControlItemId)
        .not('catalog_item_id', 'is', null)
        .limit(limit)
        
      return (historicalPOs || [])
        .map(po => po.catalog_item)
        .filter((item): item is CatalogItem => item !== null && item !== undefined)
      */
    } catch (error) {
      console.error('Error in historical suggestions:', error)
      return []
    }
  }

  /**
   * Rank and deduplicate suggestions
   */
  private rankSuggestions(suggestions: CatalogItem[], limit: number): CatalogItem[] {
    // Remove duplicates based on ID
    const unique = suggestions.reduce((acc, item) => {
      if (!acc.find(existing => existing.id === item.id)) {
        acc.push(item)
      }
      return acc
    }, [] as CatalogItem[])

    // Sort by relevance score (usage count + price availability + recency)
    return unique
      .map(item => ({
        ...item,
        relevanceScore: this.calculateRelevanceScore(item)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit)
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(item: CatalogItem): number {
    let score = 0

    // Usage count (0-50 points)
    score += Math.min(item.usage_count * 2, 50)

    // Has pricing information (20 points)
    if (item.last_purchase_price || item.average_price) {
      score += 20
    }

    // Has supplier information (15 points)
    if (item.supplier_items && item.supplier_items.length > 0) {
      score += 15
    }

    // Recently updated (0-15 points based on recency)
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(item.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysSinceUpdate < 30) {
      score += Math.max(0, 15 - daysSinceUpdate / 2)
    }

    // Has detailed specifications (10 points)
    if (item.specifications && Object.keys(item.specifications).length > 0) {
      score += 10
    }

    return score
  }

  /**
   * Get catalog items by IDs
   */
  async getCatalogItemsByIds(ids: string[]): Promise<CatalogItem[]> {
    if (!ids || ids.length === 0) return []
    
    try {
      const { data, error } = await this.supabase
        .from('catalog_items')
        .select(`
          *,
          category:item_categories(id, name),
          supplier_items:catalog_supplier_items(
            supplier_price,
            supplier:suppliers(name)
          )
        `)
        .in('id', ids)
        .eq('is_active', true)
      
      if (error) throw error
      
      return data || []
    } catch (error) {
      console.error('Error fetching catalog items by IDs:', error)
      return []
    }
  }

  /**
   * Update usage count when item is selected
   */
  async recordUsage(catalogItemId: string): Promise<void> {
    try {
      // First get the current usage count
      const { data: currentItem } = await this.supabase
        .from('catalog_items')
        .select('usage_count')
        .eq('id', catalogItemId)
        .single()
      
      if (currentItem) {
        // Increment usage count
        await this.supabase
          .from('catalog_items')
          .update({
            usage_count: (currentItem.usage_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', catalogItemId)
      }
    } catch (error) {
      console.error('Error recording catalog item usage:', error)
    }
  }

  /**
   * Get all catalog items with optional filters
   */
  async getCatalogItems(filters: {
    categoryId?: string
    supplierId?: string
    searchQuery?: string
    isActive?: boolean
    limit?: number
    offset?: number
  } = {}): Promise<{ items: CatalogItem[]; total: number }> {
    try {
      let query = this.supabase
        .from('catalog_items')
        .select(`
          *,
          category:item_categories(id, name),
          supplier_items:catalog_supplier_items(
            supplier_price,
            supplier:suppliers(name)
          )
        `, { count: 'exact' })

      // Apply filters
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId)
      }

      if (filters.supplierId) {
        query = query.eq('default_supplier_id', filters.supplierId)
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive)
      }

      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.toLowerCase()
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
      }

      // Apply pagination
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1)
      } else if (filters.limit) {
        query = query.limit(filters.limit)
      }

      query = query.order('updated_at', { ascending: false })

      const { data, error, count } = await query

      if (error) throw error

      return {
        items: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error getting catalog items:', error)
      return { items: [], total: 0 }
    }
  }

  /**
   * Get catalog item by ID with full details
   */
  async getCatalogItemById(id: string): Promise<CatalogItem | null> {
    try {
      const { data, error } = await this.supabase
        .from('catalog_items')
        .select(`
          *,
          category:item_categories(id, name),
          supplier_items:catalog_supplier_items(
            supplier_price,
            supplier:suppliers(name)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting catalog item by ID:', error)
      return null
    }
  }
}