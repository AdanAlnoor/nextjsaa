// Simple event bus for cross-component communication
type EventCallback = (data?: any) => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  // Subscribe to an event
  on(event: string, callback: EventCallback): () => void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    
    this.events[event].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  // Emit an event with optional data
  emit(event: string, data?: any): void {
    console.log(`[EventBus] Emitting event: ${event}`, data);
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // Clear all event listeners for testing/cleanup
  clear(): void {
    this.events = {};
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Define event types as constants to avoid typos
export const EVENT_TYPES = {
  BILL_PAYMENT_RECORDED: 'bill_payment_recorded',
  COST_CONTROL_REFRESH_NEEDED: 'cost_control_refresh_needed',
  DATA_UPDATED: 'data_updated',
}; 