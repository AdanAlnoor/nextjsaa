// Temporary analytics stub for cost control (disabled)
export const AnalyticsEventTypes = new Proxy({}, {
  get: (target, prop) => String(prop).toLowerCase()
}) as any;

export const trackEvent = (eventType: string, data?: any) => {
  // Analytics disabled - cost control temporarily disabled
  return;
};

export const trackError = (error: any, context?: any) => {
  // Analytics disabled - cost control temporarily disabled
  return;
};