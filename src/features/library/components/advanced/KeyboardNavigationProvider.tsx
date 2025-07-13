'use client';

import React, { createContext, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { Toast } from '@/shared/components/ui/toast';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';

interface KeyboardShortcut {
  id: string;
  keys: string[];
  description: string;
  action: () => void;
  category: 'navigation' | 'editing' | 'selection' | 'view' | 'actions';
  preventDefault?: boolean;
  enabled?: boolean;
}

interface KeyboardNavigationContextType {
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  showHelp: () => void;
  isHelpOpen: boolean;
  shortcuts: KeyboardShortcut[];
}

const KeyboardNavigationContext = createContext<KeyboardNavigationContextType | null>(null);

export const useKeyboardNavigation = () => {
  const context = useContext(KeyboardNavigationContext);
  if (!context) {
    throw new Error('useKeyboardNavigation must be used within KeyboardNavigationProvider');
  }
  return context;
};

interface KeyboardNavigationProviderProps {
  children: ReactNode;
}

export const KeyboardNavigationProvider: React.FC<KeyboardNavigationProviderProps> = ({ children }) => {
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showKeyHint, setShowKeyHint] = useState<string | null>(null);

  // Register a keyboard shortcut
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    setShortcuts(prev => {
      const filtered = prev.filter(s => s.id !== shortcut.id);
      return [...filtered, shortcut];
    });
  }, []);

  // Unregister a keyboard shortcut
  const unregisterShortcut = useCallback((id: string) => {
    setShortcuts(prev => prev.filter(s => s.id !== id));
  }, []);

  // Show help dialog
  const showHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  // Check if key combination matches shortcut
  const matchesShortcut = useCallback((shortcut: KeyboardShortcut, pressedKeys: Set<string>): boolean => {
    if (shortcut.keys.length !== pressedKeys.size) return false;
    
    return shortcut.keys.every(key => {
      const normalizedKey = normalizeKey(key);
      return pressedKeys.has(normalizedKey);
    });
  }, []);

  // Normalize key names for consistent matching
  const normalizeKey = useCallback((key: string): string => {
    const keyMap: Record<string, string> = {
      'cmd': 'Meta',
      'ctrl': 'Control',
      'alt': 'Alt',
      'shift': 'Shift',
      'space': ' ',
      'enter': 'Enter',
      'escape': 'Escape',
      'tab': 'Tab',
      'backspace': 'Backspace',
      'delete': 'Delete',
      'arrowup': 'ArrowUp',
      'arrowdown': 'ArrowDown',
      'arrowleft': 'ArrowLeft',
      'arrowright': 'ArrowRight',
    };
    
    return keyMap[key.toLowerCase()] || key;
  }, []);

  // Handle keydown events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key;
    const normalizedKey = normalizeKey(key);
    
    setPressedKeys(prev => new Set([...prev, normalizedKey]));

    // Check for matching shortcuts
    const matchingShortcut = shortcuts.find(shortcut => 
      shortcut.enabled !== false && matchesShortcut(shortcut, new Set([...pressedKeys, normalizedKey]))
    );

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
      
      // Show key hint
      setShowKeyHint(matchingShortcut.description);
      setTimeout(() => setShowKeyHint(null), 2000);
    }
  }, [shortcuts, pressedKeys, matchesShortcut]);

  // Handle keyup events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const normalizedKey = normalizeKey(event.key);
    setPressedKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(normalizedKey);
      return newSet;
    });
  }, []);

  // Clear pressed keys when window loses focus
  const handleBlur = useCallback(() => {
    setPressedKeys(new Set());
  }, []);

  // Register global keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  // Register default shortcuts
  useEffect(() => {
    const defaultShortcuts: KeyboardShortcut[] = [
      {
        id: 'help',
        keys: ['?'],
        description: 'Show keyboard shortcuts help',
        action: showHelp,
        category: 'navigation'
      },
      {
        id: 'escape-help',
        keys: ['Escape'],
        description: 'Close help dialog',
        action: () => setIsHelpOpen(false),
        category: 'navigation',
        enabled: isHelpOpen
      }
    ];

    defaultShortcuts.forEach(registerShortcut);

    return () => {
      defaultShortcuts.forEach(shortcut => unregisterShortcut(shortcut.id));
    };
  }, [registerShortcut, unregisterShortcut, showHelp, isHelpOpen]);

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryLabels = {
    navigation: 'Navigation',
    editing: 'Editing',
    selection: 'Selection',
    view: 'View',
    actions: 'Actions'
  };

  const categoryIcons = {
    navigation: '🧭',
    editing: '✏️',
    selection: '✅',
    view: '👁️',
    actions: '⚡'
  };

  // Format key combination for display
  const formatKeys = (keys: string[]): string => {
    const keyDisplayMap: Record<string, string> = {
      'Meta': '⌘',
      'Control': 'Ctrl',
      'Alt': 'Alt',
      'Shift': '⇧',
      'Enter': '↵',
      'Escape': 'Esc',
      'Tab': '⇥',
      'Backspace': '⌫',
      'Delete': '⌦',
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      ' ': 'Space'
    };

    return keys.map(key => keyDisplayMap[key] || key.toUpperCase()).join(' + ');
  };

  const contextValue: KeyboardNavigationContextType = {
    registerShortcut,
    unregisterShortcut,
    showHelp,
    isHelpOpen,
    shortcuts
  };

  return (
    <KeyboardNavigationContext.Provider value={contextValue}>
      {children}
      
      {/* Key Hint Toast */}
      {showKeyHint && (
        <div className="fixed top-4 right-4 z-50 animate-in fade-in-0 zoom-in-95">
          <Card className="bg-black text-white border-gray-700">
            <CardContent className="p-3">
              <div className="text-sm">{showKeyHint}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Help Dialog */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ⌨️ Keyboard Shortcuts
              <Badge variant="outline">Press ? to toggle</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>{categoryIcons[category as keyof typeof categoryIcons]}</span>
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryShortcuts
                    .filter(shortcut => shortcut.id !== 'help' && shortcut.id !== 'escape-help')
                    .map(shortcut => (
                    <div key={shortcut.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, index) => (
                          <React.Fragment key={key}>
                            {index > 0 && <span className="text-gray-400 mx-1">+</span>}
                            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono">
                              {formatKeys([key])}
                            </kbd>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {Object.keys(groupedShortcuts).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No keyboard shortcuts registered yet.
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Tips</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hold keys simultaneously for combination shortcuts</li>
                <li>• Press <kbd className="px-1 py-0.5 bg-white border rounded text-xs">?</kbd> anytime to show this help</li>
                <li>• Shortcuts work throughout the application</li>
                <li>• Some shortcuts may be context-sensitive</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </KeyboardNavigationContext.Provider>
  );
};

// Hook for registering shortcuts with automatic cleanup
export const useKeyboardShortcut = (
  shortcut: Omit<KeyboardShortcut, 'id'> & { id?: string },
  dependencies: any[] = []
) => {
  const { registerShortcut, unregisterShortcut } = useKeyboardNavigation();
  const shortcutId = shortcut.id || `shortcut-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    const fullShortcut: KeyboardShortcut = {
      ...shortcut,
      id: shortcutId
    };
    
    registerShortcut(fullShortcut);

    return () => {
      unregisterShortcut(shortcutId);
    };
  }, [shortcutId, registerShortcut, unregisterShortcut, ...dependencies]);

  return shortcutId;
};

// Common keyboard shortcuts hook for library components
export const useLibraryKeyboardShortcuts = (callbacks: {
  onSearch?: () => void;
  onFilter?: () => void;
  onNew?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  onSelectAll?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onBulkEdit?: () => void;
  onToggleView?: () => void;
}) => {
  const shortcuts: Array<Omit<KeyboardShortcut, 'id'>> = [
    // Navigation
    ...(callbacks.onSearch ? [{
      keys: ['Control', '/'],
      description: 'Focus search',
      action: callbacks.onSearch,
      category: 'navigation' as const
    }] : []),
    
    ...(callbacks.onFilter ? [{
      keys: ['Control', 'f'],
      description: 'Open filters',
      action: callbacks.onFilter,
      category: 'navigation' as const
    }] : []),

    ...(callbacks.onRefresh ? [{
      keys: ['F5'],
      description: 'Refresh data',
      action: callbacks.onRefresh,
      category: 'navigation' as const,
      preventDefault: true
    }] : []),

    // Actions
    ...(callbacks.onNew ? [{
      keys: ['Control', 'n'],
      description: 'Create new item',
      action: callbacks.onNew,
      category: 'actions' as const
    }] : []),

    ...(callbacks.onSave ? [{
      keys: ['Control', 's'],
      description: 'Save changes',
      action: callbacks.onSave,
      category: 'actions' as const
    }] : []),

    ...(callbacks.onCancel ? [{
      keys: ['Escape'],
      description: 'Cancel current action',
      action: callbacks.onCancel,
      category: 'actions' as const
    }] : []),

    ...(callbacks.onExport ? [{
      keys: ['Control', 'e'],
      description: 'Export data',
      action: callbacks.onExport,
      category: 'actions' as const
    }] : []),

    // Selection
    ...(callbacks.onSelectAll ? [{
      keys: ['Control', 'a'],
      description: 'Select all items',
      action: callbacks.onSelectAll,
      category: 'selection' as const
    }] : []),

    // Editing
    ...(callbacks.onEdit ? [{
      keys: ['F2'],
      description: 'Edit selected item',
      action: callbacks.onEdit,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onDelete ? [{
      keys: ['Delete'],
      description: 'Delete selected',
      action: callbacks.onDelete,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onCopy ? [{
      keys: ['Control', 'c'],
      description: 'Copy selection',
      action: callbacks.onCopy,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onPaste ? [{
      keys: ['Control', 'v'],
      description: 'Paste',
      action: callbacks.onPaste,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onUndo ? [{
      keys: ['Control', 'z'],
      description: 'Undo last action',
      action: callbacks.onUndo,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onRedo ? [{
      keys: ['Control', 'y'],
      description: 'Redo last action',
      action: callbacks.onRedo,
      category: 'editing' as const
    }] : []),

    ...(callbacks.onBulkEdit ? [{
      keys: ['Control', 'b'],
      description: 'Bulk edit mode',
      action: callbacks.onBulkEdit,
      category: 'editing' as const
    }] : []),

    // View
    ...(callbacks.onToggleView ? [{
      keys: ['Control', 'Shift', 'v'],
      description: 'Toggle view mode',
      action: callbacks.onToggleView,
      category: 'view' as const
    }] : []),
  ];

  // TODO: Fix keyboard shortcuts registration - currently disabled due to Rules of Hooks
  // shortcuts.map((shortcut, index) => 
  //   useKeyboardShortcut({
  //     ...shortcut,
  //     id: `library-shortcut-${index}`
  //   }, [shortcut.action])
  // );
};