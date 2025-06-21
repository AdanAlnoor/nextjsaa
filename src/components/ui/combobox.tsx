"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, AlertCircle } from "lucide-react"
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// Local utility function to avoid import issues
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCreate?: boolean
  onCreateOption?: (label: string) => void
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option",
  emptyText = "No options found.",
  className,
  disabled = false,
  allowCreate = false,
  onCreateOption
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [newOptionText, setNewOptionText] = React.useState("")
  const [isCreatingOption, setIsCreatingOption] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const selectedOption = React.useMemo(() => 
    options.find((option) => option.value === value),
    [options, value]
  )

  const filteredOptions = React.useMemo(() => {
    if (!search) return options
    return options.filter((option) => 
      option.label.toLowerCase().includes(search.toLowerCase())
    )
  }, [options, search])

  // Reset search and new option state when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearch("")
      setNewOptionText("")
      setIsCreatingOption(false)
      setError(null)
    }
  }, [open])

  const handleCreateOption = async () => {
    if (!newOptionText.trim() || !onCreateOption || isSubmitting) return
    
    console.log('Creating new option with text:', newOptionText);
    setIsSubmitting(true)
    setError(null)
    
    try {
      // Call the onCreateOption handler and wait for it to complete
      await Promise.resolve(onCreateOption(newOptionText.trim()))
      setIsCreatingOption(false)
      setNewOptionText("")
      setOpen(false)
    } catch (err) {
      console.error('Error creating option:', err)
      setError(err instanceof Error ? err.message : 'Failed to create option')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add keyboard support for the "Create new option" flow
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isCreatingOption && newOptionText.trim() && !isSubmitting) {
      e.preventDefault();
      handleCreateOption();
    }
  }
  
  // Use search as the new option text when clicking "Create new option"
  React.useEffect(() => {
    if (isCreatingOption && search) {
      setNewOptionText(search);
    }
  }, [isCreatingOption, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search..." 
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
          />
          <CommandEmpty>
            {emptyText}
            {allowCreate && (
              <Button
                type="button"
                className="h-auto w-full justify-start px-2 py-1.5 text-sm"
                onClick={() => {
                  setIsCreatingOption(true);
                  setError(null);
                  // Pre-fill with search text if available
                  if (search) setNewOptionText(search);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create &quot;{search || 'new option'}&quot;
              </Button>
            )}
          </CommandEmpty>
          {isCreatingOption ? (
            <div className="p-2 flex flex-col gap-2">
              <Input
                value={newOptionText}
                onChange={(e) => setNewOptionText(e.target.value)}
                placeholder="Enter new option name"
                autoFocus
                disabled={isSubmitting}
                onKeyDown={handleKeyDown}
              />
              {error && (
                <div className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreatingOption(false)
                    setError(null)
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateOption}
                  disabled={!newOptionText.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          ) : (
            <CommandList>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {allowCreate && filteredOptions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setIsCreatingOption(true)
                        setError(null)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create new option
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
} 