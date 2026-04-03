// Activity Tracker - Prevents auto logout by tracking user activity
// Monitors user interactions and maintains session state

export interface ActivityConfig {
  inactivityTimeout: number; // Time in milliseconds before considering user inactive
  heartbeatInterval: number; // Interval for sending heartbeat signals
  storageKey: string; // localStorage key for storing activity data
}

export interface ActivityData {
  lastActivity: number;
  sessionStart: number;
  totalInteractions: number;
  isActive: boolean;
}

class ActivityTracker {
  private config: ActivityConfig;
  private activityData: ActivityData;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();

  constructor(config: Partial<ActivityConfig> = {}) {
    this.config = {
      inactivityTimeout: config.inactivityTimeout || 30 * 60 * 1000, // 30 minutes default
      heartbeatInterval: config.heartbeatInterval || 60 * 1000, // 1 minute default
      storageKey: config.storageKey || 'healqr_activity_tracker',
    };

    // Load existing activity data or initialize new
    this.activityData = this.loadActivityData();

    // Bind methods
    this.handleActivity = this.handleActivity.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
  }

  // Initialize activity tracking
  public init(): void {

    // Register event listeners for user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });

    // Register visibility change handler
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    // Register beforeunload handler to save state
    window.addEventListener('beforeunload', this.handleBeforeUnload);

    // Start heartbeat
    this.startHeartbeat();

    // Mark as active
    this.updateActivity();
  }

  // Cleanup and remove listeners
  public destroy(): void {

    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);

    this.stopHeartbeat();
    this.saveActivityData();
  }

  // Handle user activity
  private handleActivity(): void {
    this.updateActivity();
    this.resetInactivityTimer();
  }

  // Update activity timestamp
  private updateActivity(): void {
    const now = Date.now();
    this.activityData.lastActivity = now;
    this.activityData.totalInteractions += 1;
    this.activityData.isActive = true;

    // Save to localStorage
    this.saveActivityData();

    // Notify listeners
    this.notifyListeners();
  }

  // Handle page visibility change
  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.saveActivityData();
      this.stopHeartbeat();
    } else {
      this.loadActivityData();
      this.startHeartbeat();
      this.updateActivity();
    }
  }

  // Handle page unload
  private handleBeforeUnload(): void {
    this.saveActivityData();
  }

  // Start heartbeat timer
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.activityData.lastActivity;

      if (timeSinceLastActivity < this.config.inactivityTimeout) {
        this.saveActivityData();
      } else {
        this.activityData.isActive = false;
        this.saveActivityData();
      }
    }, this.config.heartbeatInterval);
  }

  // Stop heartbeat timer
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Reset inactivity timer
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    this.inactivityTimer = setTimeout(() => {
      this.activityData.isActive = false;
      this.saveActivityData();
    }, this.config.inactivityTimeout);
  }

  // Save activity data to localStorage
  private saveActivityData(): void {
    try {
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.activityData)
      );
    } catch (error) {
      console.error('❌ Failed to save activity data:', error);
    }
  }

  // Load activity data from localStorage
  private loadActivityData(): ActivityData {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to load activity data:', error);
    }

    // Return default data
    return {
      lastActivity: Date.now(),
      sessionStart: Date.now(),
      totalInteractions: 0,
      isActive: true,
    };
  }

  // Get current activity data
  public getActivityData(): ActivityData {
    return { ...this.activityData };
  }

  // Check if user is currently active
  public isUserActive(): boolean {
    const timeSinceLastActivity = Date.now() - this.activityData.lastActivity;
    return timeSinceLastActivity < this.config.inactivityTimeout;
  }

  // Get session duration in milliseconds
  public getSessionDuration(): number {
    return Date.now() - this.activityData.sessionStart;
  }

  // Reset session data
  public resetSession(): void {
    this.activityData = {
      lastActivity: Date.now(),
      sessionStart: Date.now(),
      totalInteractions: 0,
      isActive: true,
    };
    this.saveActivityData();
  }

  // Subscribe to activity updates
  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback());
  }
}

// Singleton instance
let activityTrackerInstance: ActivityTracker | null = null;

// Get or create activity tracker instance
export function getActivityTracker(config?: Partial<ActivityConfig>): ActivityTracker {
  if (!activityTrackerInstance) {
    activityTrackerInstance = new ActivityTracker(config);
  }
  return activityTrackerInstance;
}

// Export class for custom instances
export { ActivityTracker };
