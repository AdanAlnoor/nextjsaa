interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    const keys = Array.from(this.cache.keys());
    const memoryUsage = JSON.stringify(Array.from(this.cache.entries())).length;

    return {
      size: this.cache.size,
      keys,
      memoryUsage
    };
  }
}

// Cache key generators
export const cacheKeys = {
  libraryHierarchy: (divisionId?: string, sectionId?: string, assemblyId?: string) => 
    `library:hierarchy:${divisionId || 'all'}:${sectionId || 'all'}:${assemblyId || 'all'}`,
  
  libraryItem: (itemId: string) => `library:item:${itemId}`,
  
  projectSchedules: (projectId: string, type?: string) => 
    `project:${projectId}:schedules:${type || 'all'}`,
  
  projectEstimates: (projectId: string, structureId?: string, elementId?: string) =>
    `project:${projectId}:estimates:${structureId || 'all'}:${elementId || 'all'}`,
  
  factorCalculation: (itemId: string, quantity: number) =>
    `factors:${itemId}:${quantity}`,
  
  MATERIAL_SCHEDULE: 'material_schedule',
  LABOUR_SCHEDULE: 'labour_schedule',
  EQUIPMENT_SCHEDULE: 'equipment_schedule'
};