/**
 * Phase 2: Library Item Manager
 * Main component for managing library items with lifecycle workflow
 */

'use client';

import React, { useState, useEffect } from 'react';
import { LibraryManagementService } from '../../services/libraryManagementService';
import { 
  LibraryItem, 
  LibraryItemStatus, 
  LibraryManagementFilter,
  LibraryManagementProps 
} from '../../types/library';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/shared/components/ui/table';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Copy, 
  Trash, 
  CheckCircle, 
  RotateCcw,
  History,
  Plus,
  Search,
  Filter,
  Star,
  AlertTriangle,
  Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { CreateItemDialog } from './CreateItemDialog';
import { CloneItemDialog } from './CloneItemDialog';
import { VersionHistoryDialog } from './VersionHistoryDialog';
import { BulkActionBar } from './BulkActionBar';
import { FilterPanel } from './FilterPanel';
import { format } from 'date-fns';

export const LibraryItemManager: React.FC<LibraryManagementProps> = ({
  initialFilters = {},
  onItemSelect,
  onItemCreate,
  onItemUpdate,
  onItemDelete,
  showBulkActions = true,
  showVersionHistory = true,
  allowQuickAdd = true,
  readOnly = false
}) => {
  // State management
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LibraryManagementFilter>(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LibraryItemStatus | 'all'>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showVersionHistoryDialog, setShowVersionHistoryDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItemForAction, setSelectedItemForAction] = useState<string | null>(null);
  
  // Pagination
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 50;

  const libraryService = LibraryManagementService.getInstance();

  // Load items effect
  useEffect(() => {
    loadItems();
  }, [searchQuery, statusFilter, currentPage, filters]);

  // Load items function
  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await libraryService.searchLibraryItems({ 
        query: searchQuery || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: pageSize,
        offset: currentPage * pageSize,
        ...filters
      });
      setItems(result.items);
      setTotalCount(result.total);
    } catch (error: any) {
      toast.error('Failed to load library items');
      console.error('Load items error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Status change handler
  const handleStatusChange = async (itemId: string, newStatus: LibraryItemStatus, notes?: string) => {
    try {
      let updatedItem: LibraryItem;
      
      if (newStatus === 'confirmed') {
        updatedItem = await libraryService.confirmLibraryItem(itemId, notes);
      } else if (newStatus === 'actual') {
        updatedItem = await libraryService.markAsActual(itemId, notes);
      } else if (newStatus === 'draft') {
        updatedItem = await libraryService.revertToDraft(itemId, notes);
      } else {
        throw new Error('Invalid status transition');
      }
      
      toast.success(`Item status updated to ${newStatus}`);
      onItemUpdate?.(updatedItem);
      await loadItems();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update item status');
    }
  };

  // Delete handler
  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item? It will be moved to the recycle bin.')) return;

    try {
      await libraryService.deleteLibraryItem(itemId, 'Deleted via management interface');
      toast.success('Item deleted successfully');
      onItemDelete?.(itemId);
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to delete item');
    }
  };

  // Restore handler
  const handleRestore = async (itemId: string) => {
    try {
      const restoredItem = await libraryService.restoreLibraryItem(itemId);
      toast.success('Item restored successfully');
      onItemUpdate?.(restoredItem);
      await loadItems();
    } catch (error: any) {
      toast.error('Failed to restore item');
    }
  };

  // Selection handlers
  const toggleItemSelection = (itemId: string) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Status badge styling
  const getStatusBadgeVariant = (status: LibraryItemStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'default';
      case 'actual': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: LibraryItemStatus) => {
    switch (status) {
      case 'draft': return '📝';
      case 'confirmed': return '✅';
      case 'actual': return '⭐';
      default: return '📦';
    }
  };

  // Bulk actions handler
  const handleBulkAction = async (action: string) => {
    const itemIds = Array.from(selectedItems);
    let result;
    
    try {
      switch (action) {
        case 'confirm':
          result = await libraryService.bulkUpdateStatus(itemIds, 'confirmed');
          break;
        case 'mark_actual':
          result = await libraryService.bulkUpdateStatus(itemIds, 'actual');
          break;
        case 'revert_to_draft':
          result = await libraryService.bulkUpdateStatus(itemIds, 'draft');
          break;
        case 'delete':
          result = await libraryService.bulkDelete(itemIds, 'Bulk delete operation');
          break;
        case 'restore':
          result = await libraryService.bulkRestore(itemIds);
          break;
        default:
          throw new Error('Unknown bulk action');
      }

      if (result) {
        toast.success(`Bulk operation complete: ${result.successful} successful, ${result.failed} failed`);
        if (result.errors.length > 0) {
          console.error('Bulk operation errors:', result.errors);
        }
      }

      clearSelection();
      await loadItems();
    } catch (error: any) {
      toast.error('Bulk operation failed');
      console.error('Bulk action error:', error);
    }
  };

  // Filter change handler
  const handleFilterChange = (newFilters: LibraryManagementFilter) => {
    setFilters(newFilters);
    setCurrentPage(0);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Library Items Management</h2>
          <p className="text-muted-foreground">
            Manage library items through their complete lifecycle: Draft → Confirmed → Actual
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Item
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={() => {
            setFilters({});
            setStatusFilter('all');
            setSearchQuery('');
          }}
        />
      )}

      {/* Bulk Action Bar */}
      {showBulkActions && selectedItems.size > 0 && !readOnly && (
        <BulkActionBar
          selectedCount={selectedItems.size}
          onBulkAction={handleBulkAction}
          onClearSelection={clearSelection}
          availableActions={['confirm', 'mark_actual', 'revert_to_draft', 'delete', 'restore']}
        />
      )}

      {/* Stats Summary */}
      {!loading && (
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="font-medium">Total Items</div>
            <div className="text-2xl font-bold">{totalCount}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="font-medium text-blue-700">Draft</div>
            <div className="text-2xl font-bold text-blue-800">
              {items.filter(i => i.status === 'draft').length}
            </div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="font-medium text-green-700">Confirmed</div>
            <div className="text-2xl font-bold text-green-800">
              {items.filter(i => i.status === 'confirmed').length}
            </div>
          </div>
          <div className="bg-amber-50 p-3 rounded-lg">
            <div className="font-medium text-amber-700">Actual</div>
            <div className="text-2xl font-bold text-amber-800">
              {items.filter(i => i.status === 'actual').length}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkActions && !readOnly && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === items.length && items.length > 0}
                    onChange={toggleAllSelection}
                    className="rounded"
                  />
                </TableHead>
              )}
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Assembly</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-muted-foreground">No items found</div>
                    {!readOnly && (
                      <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create your first item
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow 
                  key={item.id} 
                  className={`
                    ${item.isActive === false ? 'opacity-50' : ''}
                    ${onItemSelect ? 'cursor-pointer hover:bg-muted/50' : ''}
                  `}
                  onClick={onItemSelect ? () => onItemSelect(item) : undefined}
                >
                  {showBulkActions && !readOnly && (
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                        disabled={item.isActive === false}
                        className="rounded"
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm">{item.code}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {!item.validation.isComplete && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" title="Incomplete item - missing factors" />
                      )}
                    </div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {item.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{item.assembly?.code}</div>
                      <div className="text-muted-foreground">{item.assembly?.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(item.status)} className="gap-1">
                      <span>{getStatusIcon(item.status)}</span>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">v{item.version}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {item.lastModified && format(new Date(item.lastModified), 'MMM dd, HH:mm')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* View Action */}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            onItemSelect?.(item);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {/* Status Actions */}
                        {!readOnly && item.status === 'draft' && item.isActive !== false && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(item.id, 'confirmed');
                            }}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirm
                          </DropdownMenuItem>
                        )}
                        {!readOnly && item.status === 'confirmed' && item.isActive !== false && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(item.id, 'actual');
                            }}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Mark as Actual
                          </DropdownMenuItem>
                        )}
                        {!readOnly && (item.status === 'confirmed' || item.status === 'actual') && item.isActive !== false && (
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(item.id, 'draft');
                            }}
                          >
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Revert to Draft
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Other Actions */}
                        {!readOnly && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemForAction(item.id);
                              setShowCloneDialog(true);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Clone
                          </DropdownMenuItem>
                        )}
                        
                        {showVersionHistory && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItemForAction(item.id);
                              setShowVersionHistoryDialog(true);
                            }}
                          >
                            <History className="mr-2 h-4 w-4" />
                            Version History
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        {/* Delete/Restore Actions */}
                        {!readOnly && (
                          item.isActive === false ? (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(item.id);
                              }}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Restore
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id);
                              }}
                              className="text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} items
          </p>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={(currentPage + 1) * pageSize >= totalCount}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      {!readOnly && (
        <>
          <CreateItemDialog
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSuccess={(item) => {
              onItemCreate?.(item);
              loadItems();
              setShowCreateDialog(false);
            }}
          />

          {selectedItemForAction && (
            <>
              <CloneItemDialog
                open={showCloneDialog}
                onOpenChange={setShowCloneDialog}
                sourceItemId={selectedItemForAction}
                onSuccess={(item) => {
                  onItemCreate?.(item);
                  loadItems();
                  setShowCloneDialog(false);
                  setSelectedItemForAction(null);
                }}
              />

              <VersionHistoryDialog
                open={showVersionHistoryDialog}
                onOpenChange={setShowVersionHistoryDialog}
                itemId={selectedItemForAction}
                onRestore={() => {
                  loadItems();
                  setShowVersionHistoryDialog(false);
                  setSelectedItemForAction(null);
                }}
              />
            </>
          )}
        </>
      )}
    </div>
  );
};