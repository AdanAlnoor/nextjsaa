import type { Database } from '@/shared/types/supabase-schema';

type LibraryItem = Database['public']['Tables']['library_items']['Row'] & {
  assembly?: Database['public']['Tables']['assemblies']['Row'] & {
    section?: Database['public']['Tables']['sections']['Row'] & {
      division?: Database['public']['Tables']['divisions']['Row'];
    };
  };
};

export interface LibraryItemSelectorProps {
  open: boolean;
  onClose: () => void;
  onItemsSelected: (items: LibraryItem[]) => Promise<void>;
  projectId: string;
  structureId: string;
  elementId: string;
  allowMultiple?: boolean;
  showFactorPreview?: boolean;
  preSelectedItems?: string[];
}

export interface LibraryBrowserProps {
  searchQuery: string;
  selectedItems: LibraryItem[];
  onItemSelect: (item: LibraryItem) => void;
  showSelection: boolean;
  allowMultiple: boolean;
  projectId: string;
}