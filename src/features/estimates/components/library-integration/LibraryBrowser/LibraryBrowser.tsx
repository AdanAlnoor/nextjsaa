'use client'

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Check, Package } from 'lucide-react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Button } from '@/shared/components/ui/button';
import { createClient } from '@/shared/lib/supabase/client';
import { cn } from '@/shared/lib/utils';
import type { Database } from '@/shared/types/supabase-schema';

type LibraryItem = Database['public']['Tables']['library_items']['Row'] & {
  assembly?: Database['public']['Tables']['assemblies']['Row'] & {
    section?: Database['public']['Tables']['sections']['Row'] & {
      division?: Database['public']['Tables']['divisions']['Row'];
    };
  };
};

type Division = Database['public']['Tables']['divisions']['Row'];
type Section = Database['public']['Tables']['sections']['Row'] & { division?: Division };
type Assembly = Database['public']['Tables']['assemblies']['Row'] & { section?: Section };

interface LibraryBrowserProps {
  searchQuery: string;
  selectedItems: LibraryItem[];
  onItemSelect: (item: LibraryItem) => void;
  showSelection: boolean;
  allowMultiple: boolean;
  projectId: string;
}

interface TreeNode {
  id: string;
  code: string;
  name: string;
  type: 'division' | 'section' | 'assembly' | 'item';
  children?: TreeNode[];
  data?: any;
  isExpanded?: boolean;
}

export const LibraryBrowser: React.FC<LibraryBrowserProps> = ({
  searchQuery,
  selectedItems,
  onItemSelect,
  showSelection,
  allowMultiple,
  projectId
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    try {
      setIsLoading(true);

      // Load all data in parallel
      const [
        { data: divisions },
        { data: sections },
        { data: assemblies },
        { data: items }
      ] = await Promise.all([
        supabase.from('divisions').select('*').order('code'),
        supabase.from('sections').select('*, division:divisions(*)').order('code'),
        supabase.from('assemblies').select('*, section:sections(*, division:divisions(*))').order('code'),
        supabase.from('library_items').select('*, assembly:assemblies(*, section:sections(*, division:divisions(*)))').order('code')
      ]);

      if (!divisions || !sections || !assemblies || !items) {
        console.error('Failed to load library data');
        return;
      }

      // Build tree structure
      const tree = buildTreeStructure(divisions, sections, assemblies, items);
      setTreeData(tree);
    } catch (error) {
      console.error('Error loading library data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const buildTreeStructure = (
    divisions: Division[],
    sections: Section[],
    assemblies: Assembly[],
    items: LibraryItem[]
  ): TreeNode[] => {
    const divisionNodes: TreeNode[] = divisions.map(div => ({
      id: `div-${div.id}`,
      code: div.code,
      name: div.name,
      type: 'division' as const,
      data: div,
      children: []
    }));

    // Add sections to divisions
    sections.forEach(section => {
      const divNode = divisionNodes.find(d => d.data.id === section.division_id);
      if (divNode) {
        const sectionNode: TreeNode = {
          id: `sec-${section.id}`,
          code: section.code,
          name: section.name,
          type: 'section' as const,
          data: section,
          children: []
        };
        divNode.children!.push(sectionNode);
      }
    });

    // Add assemblies to sections
    assemblies.forEach(assembly => {
      divisionNodes.forEach(divNode => {
        const secNode = divNode.children?.find(s => s.data.id === assembly.section_id);
        if (secNode) {
          const assemblyNode: TreeNode = {
            id: `asm-${assembly.id}`,
            code: assembly.code,
            name: assembly.name,
            type: 'assembly' as const,
            data: assembly,
            children: []
          };
          secNode.children!.push(assemblyNode);
        }
      });
    });

    // Add items to assemblies
    items.forEach(item => {
      divisionNodes.forEach(divNode => {
        divNode.children?.forEach(secNode => {
          const asmNode = secNode.children?.find(a => a.data.id === item.assembly_id);
          if (asmNode) {
            const itemNode: TreeNode = {
              id: `item-${item.id}`,
              code: item.code,
              name: item.name,
              type: 'item' as const,
              data: item
            };
            asmNode.children!.push(itemNode);
          }
        });
      });
    });

    return divisionNodes;
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const isItemSelected = (item: LibraryItem) => {
    return selectedItems.some(selected => selected.id === item.id);
  };

  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;

    const lowerQuery = query.toLowerCase();
    
    return nodes.reduce((acc: TreeNode[], node) => {
      const matches = 
        node.name.toLowerCase().includes(lowerQuery) ||
        node.code.toLowerCase().includes(lowerQuery);

      if (node.children) {
        const filteredChildren = filterTree(node.children, query);
        if (filteredChildren.length > 0) {
          acc.push({
            ...node,
            children: filteredChildren,
            isExpanded: true
          });
        } else if (matches) {
          acc.push({ ...node });
        }
      } else if (matches) {
        acc.push(node);
      }

      return acc;
    }, []);
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id) || node.isExpanded;
    const hasChildren = node.children && node.children.length > 0;
    const isItem = node.type === 'item';
    const itemData = isItem ? node.data as LibraryItem : null;
    const isSelected = itemData && isItemSelected(itemData);

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center py-2 px-2 hover:bg-gray-50 cursor-pointer",
            isSelected && "bg-blue-50"
          )}
          style={{ paddingLeft: `${level * 24 + 8}px` }}
          onClick={() => {
            if (isItem && itemData) {
              onItemSelect(itemData);
            } else {
              toggleNode(node.id);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          <div className="w-5 h-5 mr-2 flex items-center justify-center">
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )
            ) : isItem ? (
              <Package className="h-4 w-4 text-gray-400" />
            ) : null}
          </div>

          {/* Selection Checkbox */}
          {showSelection && isItem && (
            <div className="mr-2" onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => itemData && onItemSelect(itemData)}
              />
            </div>
          )}

          {/* Node Content */}
          <div className="flex-1 flex items-center gap-2">
            <span className="font-mono text-sm text-gray-600">{node.code}</span>
            <span className="text-sm">{node.name}</span>
            {isItem && itemData && (
              <span className="text-xs text-gray-500">({itemData.unit})</span>
            )}
          </div>

          {/* Selected Indicator */}
          {isSelected && (
            <Check className="h-4 w-4 text-blue-600 ml-2" />
          )}
        </div>

        {/* Render Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterTree(treeData, searchQuery);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading library items...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {filteredTree.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          {searchQuery ? 'No items found matching your search.' : 'No library items available.'}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {filteredTree.map(node => renderTreeNode(node))}
        </div>
      )}
    </div>
  );
};