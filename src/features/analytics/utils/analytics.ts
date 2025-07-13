// Enum for different types of events we want to track
export enum AnalyticsEventTypes {
  PAGE_VIEW = 'page_view',
  INTERACTION = 'interaction',
  FILTER_APPLIED = 'filter_applied',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  PAYMENT = 'payment',
  ERROR = 'error',
  PAGINATION = 'pagination',
  SORT_CHANGED = 'sort_changed',
  DIALOG_OPEN = 'dialog_open',
  
  // Bill specific events
  BILL_VIEWED = 'bill_viewed',
  BILL_CREATED = 'bill_created',
  BILL_UPDATED = 'bill_updated',
  BILL_DELETED = 'bill_deleted',
  EDIT_DIALOG_OPENED = 'edit_bill_dialog_opened',
  DELETE_DIALOG_OPENED = 'delete_bill_dialog_opened',
  PAYMENT_DIALOG_OPENED = 'record_payment_dialog_opened',
  BILL_DUPLICATED = 'bill_duplicated',
  PO_DIALOG_OPENED = 'convert_po_dialog_opened',
  PAYMENT_RECORDED = 'payment_recorded',
  PO_CONVERTED = 'po_converted'
}

/**
 * Tracks an event in the analytics system
 * @param eventType The type of event to track
 * @param properties Additional properties to include with the event
 */
export function trackEvent(eventType: AnalyticsEventTypes | string, properties: Record<string, any> = {}) {
  // In a real implementation, this would send events to an analytics service
  // like Google Analytics, Mixpanel, etc.
  console.log(`Analytics Event: ${eventType}`, properties);
  
  // Example integration with a service like Amplitude:
  // if (typeof window !== 'undefined' && window.amplitude) {
  //   window.amplitude.track(eventType, properties);
  // }
}

/**
 * Tracks errors in the analytics system
 * @param error The error object
 * @param context Additional context information about where the error occurred
 */
export function trackError(error: any, context: Record<string, any> = {}) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  console.error('Tracked Error:', errorMessage, context);
  
  trackEvent(AnalyticsEventTypes.ERROR, {
    error_message: errorMessage,
    error_stack: errorStack,
    ...context
  });
  
  // In a real implementation, you might want to send this to an error tracking
  // service like Sentry:
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context
  //   });
  // }
} 