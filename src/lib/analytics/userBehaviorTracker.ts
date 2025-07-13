export interface UserJourneyEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'page_view' | 'click' | 'search' | 'selection' | 'completion' | 'error';
  eventData: {
    pageName?: string;
    elementName?: string;
    searchTerm?: string;
    searchResults?: number;
    itemId?: string;
    timeToComplete?: number;
    errorType?: string;
    errorMessage?: string;
    [key: string]: any;
  };
  timestamp: Date;
  userAgent?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
}

export interface UserError {
  userId: string;
  sessionId: string;
  errorType: 'system' | 'user' | 'network' | 'validation';
  errorMessage: string;
  context: string;
  stackTrace?: string;
  userAction?: string;
  timestamp: Date;
}

export interface RecoveryAction {
  userId: string;
  sessionId: string;
  originalError: string;
  recoveryMethod: 'retry' | 'alternative' | 'help' | 'abandon';
  wasSuccessful: boolean;
  timeToRecover: number;
  timestamp: Date;
}

export interface PerformanceMetric {
  userId: string;
  sessionId: string;
  metricName: string;
  metricValue: number;
  metricUnit: 'ms' | 'seconds' | 'count' | 'bytes';
  context: string;
  timestamp: Date;
}

export class UserBehaviorTracker {
  private static instance: UserBehaviorTracker;
  private userId: string | null = null;
  private sessionId: string;
  private eventQueue: UserJourneyEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
    this.startPeriodicFlush();
  }

  public static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker();
    }
    return UserBehaviorTracker.instance;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  // Core tracking methods
  public trackLibrarySearch(searchTerm: string, resultsCount: number, responseTime: number): void {
    this.trackEvent('search', {
      searchTerm,
      searchResults: resultsCount,
      responseTime,
      context: 'library_search'
    });
  }

  public trackItemSelection(itemId: string, timeToSelect: number, selectionMethod: 'click' | 'keyboard' | 'search'): void {
    this.trackEvent('selection', {
      itemId,
      timeToSelect,
      selectionMethod,
      context: 'library_item_selection'
    });
  }

  public trackBulkOperation(operationType: string, itemCount: number, completionTime: number, success: boolean): void {
    this.trackEvent('completion', {
      operationType,
      itemCount,
      completionTime,
      success,
      context: 'bulk_operation'
    });
  }

  public trackEstimateCreation(elementCount: number, totalTime: number, libraryItemsUsed: number): void {
    this.trackEvent('completion', {
      elementCount,
      totalTime,
      libraryItemsUsed,
      efficiency: libraryItemsUsed / elementCount,
      context: 'estimate_creation'
    });
  }

  public trackPageLoad(pageName: string, loadTime: number): void {
    this.trackEvent('page_view', {
      pageName,
      loadTime,
      context: 'navigation'
    });
  }

  public trackUserJourney(journey: UserJourneyEvent[]): void {
    journey.forEach(event => this.eventQueue.push(event));
    this.flushEvents();
  }

  public trackFeatureUsage(featureName: string, usageDuration: number, interactionCount?: number): void {
    this.trackEvent('completion', {
      featureName,
      usageDuration,
      interactionCount,
      context: 'feature_usage'
    });
  }

  // Error tracking
  public trackUserError(error: UserError): void {
    this.trackEvent('error', {
      errorType: error.errorType,
      errorMessage: error.errorMessage,
      errorContext: error.context,
      userAction: error.userAction,
      context: 'error_tracking'
    });

    // Also send to error monitoring service
    this.sendToErrorService(error);
  }

  public trackRecoveryAction(action: RecoveryAction): void {
    this.trackEvent('completion', {
      originalError: action.originalError,
      recoveryMethod: action.recoveryMethod,
      wasSuccessful: action.wasSuccessful,
      timeToRecover: action.timeToRecover,
      context: 'error_recovery'
    });
  }

  // Performance tracking
  public trackPerformanceMetric(metric: PerformanceMetric): void {
    this.trackEvent('completion', {
      metricName: metric.metricName,
      metricValue: metric.metricValue,
      metricUnit: metric.metricUnit,
      context: `performance_${metric.context}`
    });
  }

  public measureAndTrack<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: string = 'general'
  ): Promise<T> {
    const startTime = performance.now();
    
    return operation()
      .then(result => {
        const duration = performance.now() - startTime;
        this.trackPerformanceMetric({
          userId: this.userId || 'anonymous',
          sessionId: this.sessionId,
          metricName: operationName,
          metricValue: duration,
          metricUnit: 'ms',
          context,
          timestamp: new Date()
        });
        return result;
      })
      .catch(error => {
        const duration = performance.now() - startTime;
        this.trackUserError({
          userId: this.userId || 'anonymous',
          sessionId: this.sessionId,
          errorType: 'system',
          errorMessage: error.message,
          context: `${context}_${operationName}`,
          timestamp: new Date()
        });
        throw error;
      });
  }

  // User engagement tracking
  public trackUserEngagement(): void {
    const sessionDuration = Date.now() - this.startTime;
    const eventsCount = this.eventQueue.length;
    
    this.trackEvent('completion', {
      sessionDuration,
      eventsCount,
      engagement: this.calculateEngagementScore(),
      context: 'session_summary'
    });
  }

  // Utility methods
  private trackEvent(eventType: UserJourneyEvent['eventType'], eventData: any): void {
    const event: UserJourneyEvent = {
      id: this.generateEventId(),
      userId: this.userId || 'anonymous',
      sessionId: this.sessionId,
      eventType,
      eventData,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      deviceType: this.detectDeviceType()
    };

    this.eventQueue.push(event);

    // Flush immediately for critical events
    if (eventType === 'error' || this.eventQueue.length >= 10) {
      this.flushEvents();
    }
  }

  private setupEventListeners(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_view', {
          action: 'blur',
          context: 'visibility_change'
        });
        this.flushEvents();
      } else {
        this.trackEvent('page_view', {
          action: 'focus',
          context: 'visibility_change'
        });
      }
    });

    // Track before page unload
    window.addEventListener('beforeunload', () => {
      this.trackUserEngagement();
      this.flushEvents();
    });

    // Track clicks on important elements
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.dataset.track) {
        this.trackEvent('click', {
          elementName: target.dataset.track,
          elementType: target.tagName.toLowerCase(),
          context: 'ui_interaction'
        });
      }
    });
  }

  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, 30000); // Flush every 30 seconds
  }

  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (error) {
      console.warn('Failed to send analytics events:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToSend);
    }
  }

  private async sendToErrorService(error: UserError): Promise<void> {
    try {
      await fetch('/api/monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(error),
      });
    } catch (err) {
      console.warn('Failed to send error to monitoring service:', err);
    }
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateEventId(): string {
    return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private calculateEngagementScore(): number {
    const sessionDuration = Date.now() - this.startTime;
    const eventsCount = this.eventQueue.length;
    
    // Simple engagement calculation
    // More events and longer session = higher engagement
    const durationScore = Math.min(sessionDuration / (10 * 60 * 1000), 1); // Max 10 minutes
    const activityScore = Math.min(eventsCount / 20, 1); // Max 20 events
    
    return Math.round((durationScore + activityScore) * 50); // 0-100 scale
  }

  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.trackUserEngagement();
    this.flushEvents();
  }
}

// React hook for easy integration
export function useUserBehaviorTracker() {
  const tracker = UserBehaviorTracker.getInstance();

  const trackLibrarySearch = (searchTerm: string, resultsCount: number, responseTime: number) => {
    tracker.trackLibrarySearch(searchTerm, resultsCount, responseTime);
  };

  const trackItemSelection = (itemId: string, timeToSelect: number, method: 'click' | 'keyboard' | 'search' = 'click') => {
    tracker.trackItemSelection(itemId, timeToSelect, method);
  };

  const trackBulkOperation = (operationType: string, itemCount: number, completionTime: number, success: boolean = true) => {
    tracker.trackBulkOperation(operationType, itemCount, completionTime, success);
  };

  const trackFeatureUsage = (featureName: string, usageDuration: number, interactionCount?: number) => {
    tracker.trackFeatureUsage(featureName, usageDuration, interactionCount);
  };

  const trackError = (error: Error, context: string, userAction?: string) => {
    tracker.trackUserError({
      userId: tracker['userId'] || 'anonymous',
      sessionId: tracker['sessionId'],
      errorType: 'system',
      errorMessage: error.message,
      context,
      stackTrace: error.stack,
      userAction,
      timestamp: new Date()
    });
  };

  const measurePerformance = <T>(
    operation: () => Promise<T>,
    operationName: string,
    context: string = 'general'
  ): Promise<T> => {
    return tracker.measureAndTrack(operation, operationName, context);
  };

  return {
    trackLibrarySearch,
    trackItemSelection,
    trackBulkOperation,
    trackFeatureUsage,
    trackError,
    measurePerformance,
    setUserId: (userId: string) => tracker.setUserId(userId),
  };
}

// Initialize tracker when module loads (browser only)
if (typeof window !== 'undefined') {
  UserBehaviorTracker.getInstance();
}