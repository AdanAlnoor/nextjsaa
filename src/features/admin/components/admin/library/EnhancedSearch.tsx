'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, Clock, Filter, ChevronDown } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'

interface SearchSuggestion {
  id: string
  text: string
  type: 'item' | 'code' | 'description'
  category?: string
}

interface EnhancedSearchProps {
  value: string
  onChange: (value: string) => void
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void
  placeholder?: string
  suggestions?: SearchSuggestion[]
  recentSearches?: string[]
  onAddToRecent?: (search: string) => void
}

export function EnhancedSearch({
  value,
  onChange,
  onSuggestionSelect,
  placeholder = "Search library items...",
  suggestions = [],
  recentSearches = [],
  onAddToRecent
}: EnhancedSearchProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredSuggestions, setFilteredSuggestions] = useState<SearchSuggestion[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value.trim().length > 1) {
      const filtered = suggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
      setFilteredSuggestions(filtered)
      setShowSuggestions(isFocused && filtered.length > 0)
    } else {
      setFilteredSuggestions([])
      setShowSuggestions(false)
    }
  }, [value, suggestions, isFocused])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text)
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion)
    }
    if (onAddToRecent) {
      onAddToRecent(suggestion.text)
    }
    setShowSuggestions(false)
    inputRef.current?.blur()
  }

  const handleRecentSearch = (search: string) => {
    onChange(search)
    if (onAddToRecent) {
      onAddToRecent(search)
    }
    setShowSuggestions(false)
  }

  const clearSearch = () => {
    onChange('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      if (onAddToRecent) {
        onAddToRecent(value.trim())
      }
      setShowSuggestions(false)
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'item':
        return '📦'
      case 'code':
        return '🔢'
      case 'description':
        return '📝'
      default:
        return '🔍'
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true)
            if (value.trim().length === 0 && recentSearches.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onBlur={(e) => {
            // Delay hiding suggestions to allow for clicks
            setTimeout(() => {
              if (!suggestionsRef.current?.contains(document.activeElement)) {
                setIsFocused(false)
                setShowSuggestions(false)
              }
            }, 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10 h-10 w-full"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-80 overflow-y-auto border shadow-lg bg-white"
        >
          {value.trim().length === 0 && recentSearches.length > 0 && (
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Recent searches</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {recentSearches.slice(0, 5).map((search, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="cursor-pointer hover:bg-gray-200 transition-colors"
                    onClick={() => handleRecentSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {filteredSuggestions.length > 0 && (
            <div className="p-1">
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {suggestion.text}
                    </div>
                    {suggestion.category && (
                      <div className="text-xs text-gray-500">
                        {suggestion.category}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" size="sm">
                    {suggestion.type}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {value.trim().length > 1 && filteredSuggestions.length === 0 && (
            <div className="p-4 text-center text-gray-500 text-sm">
              No suggestions found for &quot;{value}&quot;
            </div>
          )}
        </Card>
      )}
    </div>
  )
}