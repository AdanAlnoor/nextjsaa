export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REGISTER: '/api/auth/register',
    REFRESH: '/api/auth/refresh',
    PROFILE: '/api/auth/profile',
  },

  // Users
  USERS: {
    LIST: '/api/users',
    DETAIL: (id: string) => `/api/users/${id}`,
    CREATE: '/api/users',
    UPDATE: (id: string) => `/api/users/${id}`,
    DELETE: (id: string) => `/api/users/${id}`,
  },

  // Projects
  PROJECTS: {
    LIST: '/api/projects',
    DETAIL: (id: string) => `/api/projects/${id}`,
    CREATE: '/api/projects',
    UPDATE: (id: string) => `/api/projects/${id}`,
    DELETE: (id: string) => `/api/projects/${id}`,
  },

  // Library
  LIBRARY: {
    ITEMS: {
      LIST: '/api/library/items',
      DETAIL: (id: string) => `/api/library/items/${id}`,
      CREATE: '/api/library/items',
      UPDATE: (id: string) => `/api/library/items/${id}`,
      DELETE: (id: string) => `/api/library/items/${id}`,
      SEARCH: '/api/library/items/search',
    },
    DIVISIONS: {
      LIST: '/api/library/divisions',
      DETAIL: (id: string) => `/api/library/divisions/${id}`,
    },
    SECTIONS: {
      LIST: '/api/library/sections',
      DETAIL: (id: string) => `/api/library/sections/${id}`,
    },
    ASSEMBLIES: {
      LIST: '/api/library/assemblies',
      DETAIL: (id: string) => `/api/library/assemblies/${id}`,
    },
  },

  // Cost Control
  COST_CONTROL: {
    PURCHASE_ORDERS: {
      LIST: '/api/cost-control/purchase-orders',
      DETAIL: (id: string) => `/api/cost-control/purchase-orders/${id}`,
      CREATE: '/api/cost-control/purchase-orders',
      UPDATE: (id: string) => `/api/cost-control/purchase-orders/${id}`,
      DELETE: (id: string) => `/api/cost-control/purchase-orders/${id}`,
      APPROVE: (id: string) => `/api/cost-control/purchase-orders/${id}/approve`,
      REJECT: (id: string) => `/api/cost-control/purchase-orders/${id}/reject`,
    },
    BILLS: {
      LIST: '/api/cost-control/bills',
      DETAIL: (id: string) => `/api/cost-control/bills/${id}`,
      CREATE: '/api/cost-control/bills',
      UPDATE: (id: string) => `/api/cost-control/bills/${id}`,
      DELETE: (id: string) => `/api/cost-control/bills/${id}`,
    },
  },

  // Estimates
  ESTIMATES: {
    LIST: '/api/estimates',
    DETAIL: (id: string) => `/api/estimates/${id}`,
    CREATE: '/api/estimates',
    UPDATE: (id: string) => `/api/estimates/${id}`,
    DELETE: (id: string) => `/api/estimates/${id}`,
    DUPLICATE: (id: string) => `/api/estimates/${id}/duplicate`,
  },

  // Analytics
  ANALYTICS: {
    DASHBOARD: '/api/analytics/dashboard',
    REPORTS: {
      COST_SUMMARY: '/api/analytics/reports/cost-summary',
      PROJECT_PERFORMANCE: '/api/analytics/reports/project-performance',
      BUDGET_ANALYSIS: '/api/analytics/reports/budget-analysis',
    },
  },

  // Admin
  ADMIN: {
    SETTINGS: '/api/admin/settings',
    USERS: '/api/admin/users',
    AUDIT_LOGS: '/api/admin/audit-logs',
    SYSTEM_HEALTH: '/api/admin/system/health',
  },
} as const

export type ApiEndpoints = typeof API_ENDPOINTS