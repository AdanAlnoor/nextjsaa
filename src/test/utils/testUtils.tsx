import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/shared/components/common/theme-provider';
import { Toaster } from '@/shared/components/ui/toaster';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

interface TestProviderProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

const TestProvider: React.FC<TestProviderProps> = ({ 
  children, 
  queryClient = createTestQueryClient() 
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { queryClient, ...renderOptions } = options || {};
  
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <TestProvider queryClient={queryClient}>{children}</TestProvider>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Custom matchers for testing
export const waitForElementToBeRemoved = (
  element: HTMLElement | (() => HTMLElement),
  options?: { timeout?: number }
) => {
  // Implementation would go here - this is a placeholder
  return Promise.resolve();
};

// Mock user event helpers
export const mockUserEvent = {
  click: jest.fn(),
  type: jest.fn(),
  selectOptions: jest.fn(),
  clear: jest.fn(),
  tab: jest.fn(),
  keyboard: jest.fn(),
  hover: jest.fn(),
  unhover: jest.fn(),
  copy: jest.fn(),
  cut: jest.fn(),
  paste: jest.fn(),
};

// Test ID selectors
export const testIds = {
  libraryBrowser: 'library-browser',
  libraryItem: 'library-item',
  libraryItemDetails: 'library-item-details',
  searchInput: 'search-input',
  filterButton: 'filter-button',
  bulkActionsPanel: 'bulk-actions-panel',
  spreadsheetEditor: 'spreadsheet-editor',
  mobileInterface: 'mobile-interface',
  advancedFilterBuilder: 'advanced-filter-builder',
  keyboardShortcutHelp: 'keyboard-shortcut-help',
} as const;

// Helper for testing async operations
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms));

// Helper for testing error boundaries
export const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Mock Supabase responses
export const mockSupabaseResponse = <T,>(data: T, error: any = null) => ({
  data,
  error,
  count: Array.isArray(data) ? data.length : null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

// Form testing helpers
export const fillForm = async (
  fields: Record<string, string>,
  getByRole: (role: string, options?: any) => HTMLElement
) => {
  for (const [fieldName, value] of Object.entries(fields)) {
    const field = getByRole('textbox', { name: new RegExp(fieldName, 'i') });
    await mockUserEvent.clear(field);
    await mockUserEvent.type(field, value);
  }
};

// Table testing helpers
export const getTableRows = (container: HTMLElement) => {
  return Array.from(container.querySelectorAll('tbody tr'));
};

export const getTableCells = (row: HTMLElement) => {
  return Array.from(row.querySelectorAll('td'));
};

// Performance testing helpers
export const measurePerformance = async <T,>(
  operation: () => Promise<T> | T,
  name: string = 'operation'
): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  
  console.log(`${name} took ${duration.toFixed(2)}ms`);
  
  return { result, duration };
};

// Memory testing helpers
export const getMemoryUsage = () => {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
};

export const expectMemoryLeak = (
  before: any,
  after: any,
  threshold: number = 10 * 1024 * 1024 // 10MB
) => {
  if (before && after) {
    const increase = after.usedJSHeapSize - before.usedJSHeapSize;
    expect(increase).toBeLessThan(threshold);
  }
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { customRender as render };

// Re-export user event
export { default as userEvent } from '@testing-library/user-event';