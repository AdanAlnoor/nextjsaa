'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Label } from '@/shared/components/ui/label'
import { Loader2, Package, Star, Clock, DollarSign } from 'lucide-react'
import { CatalogService, CatalogItem } from '@/library/services/catalogService'
import { formatCurrency } from '@/shared/lib/utils'

interface CatalogSuggestionsProps {
  costControlItemId: string
  onItemSelect: (item: CatalogItem) => void
  searchTerm?: string
  projectId?: string
  className?: string
}

interface CatalogSuggestionCardProps {
  item: CatalogItem
  onSelect: () => void
}

const CatalogSuggestionCard: React.FC<CatalogSuggestionCardProps> = ({ item, onSelect }) => {
  const getPriceDisplay = () => {
    if (item.average_price) {
      return formatCurrency(item.average_price)
    }
    if (item.last_purchase_price) {
      return formatCurrency(item.last_purchase_price)
    }
    if (item.supplier_items && item.supplier_items.length > 0) {
      const prices = item.supplier_items.map(si => si.supplier_price).filter(Boolean)
      if (prices.length > 0) {
        const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
        return formatCurrency(avgPrice)
      }
    }
    return 'Price not available'
  }

  const hasPrice = item.average_price || item.last_purchase_price || 
    (item.supplier_items && item.supplier_items.some(si => si.supplier_price))

  return (
    <Card className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <h4 className="font-medium text-sm truncate">{item.name}</h4>
              {item.usage_count > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  {item.usage_count}
                </Badge>
              )}
            </div>
            
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
              {item.description || 'No description available'}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500">
              {item.category && (
                <span className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {item.category.name}
                  </Badge>
                </span>
              )}
              
              {item.default_unit && (
                <span>Unit: {item.default_unit}</span>
              )}
              
              {item.lead_time_days > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.lead_time_days}d
                </span>
              )}
            </div>
          </div>
          
          <div className="ml-4 text-right flex-shrink-0">
            <div className={`text-sm font-medium ${hasPrice ? 'text-green-600' : 'text-gray-400'}`}>
              <DollarSign className="h-4 w-4 inline mr-1" />
              {getPriceDisplay()}
            </div>
            
            {item.supplier_items && item.supplier_items.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {item.supplier_items.length} supplier{item.supplier_items.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
        
        {/* Keywords for context */}
        {item.keywords && item.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.keywords.slice(0, 3).map((keyword, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {keyword}
              </span>
            ))}
            {item.keywords.length > 3 && (
              <span className="text-xs text-gray-500">+{item.keywords.length - 3} more</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const CatalogSuggestions: React.FC<CatalogSuggestionsProps> = ({
  costControlItemId,
  onItemSelect,
  searchTerm = '',
  projectId,
  className = ''
}) => {
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const catalogService = CatalogService.getInstance()

  useEffect(() => {
    if (costControlItemId) {
      loadSuggestions()
    }
  }, [costControlItemId, searchTerm])

  const loadSuggestions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await catalogService.getCatalogSuggestions({
        costControlItemId,
        searchTerm,
        limit: 8,
        projectId
      })
      
      setSuggestions(results)
    } catch (err) {
      console.error('Failed to load catalog suggestions:', err)
      setError('Failed to load suggestions')
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleItemSelect = async (item: CatalogItem) => {
    try {
      // Record usage for analytics
      await catalogService.recordUsage(item.id)
      
      // Notify parent component
      onItemSelect(item)
    } catch (err) {
      console.error('Error selecting catalog item:', err)
      // Still call onItemSelect even if usage recording fails
      onItemSelect(item)
    }
  }

  const getSuggestionMessage = () => {
    if (loading) return 'Loading intelligent suggestions...'
    if (error) return error
    if (suggestions.length === 0) {
      if (searchTerm) {
        return `No catalog items found matching "${searchTerm}"`
      }
      return 'No catalog suggestions found for this cost control item'
    }
    
    const baseMessage = `Found ${suggestions.length} suggested item${suggestions.length > 1 ? 's' : ''}`
    if (searchTerm) {
      return `${baseMessage} matching "${searchTerm}"`
    }
    return `${baseMessage} for this cost control item`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium text-gray-900">
            Catalog Suggestions
          </Label>
          <p className="text-xs text-gray-500 mt-1">
            {getSuggestionMessage()}
          </p>
        </div>
        
        {loading && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        )}
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
          {error}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-auto p-0 text-red-600 hover:text-red-700"
            onClick={loadSuggestions}
          >
            Try again
          </Button>
        </div>
      )}

      {!loading && !error && suggestions.length > 0 && (
        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {suggestions.map((item) => (
            <CatalogSuggestionCard
              key={item.id}
              item={item}
              onSelect={() => handleItemSelect(item)}
            />
          ))}
        </div>
      )}

      {!loading && !error && suggestions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">
            {searchTerm 
              ? 'No items found matching your search'
              : 'No catalog suggestions available'
            }
          </p>
          <p className="text-xs mt-1">
            Try entering a description to get suggestions
          </p>
        </div>
      )}
    </div>
  )
}