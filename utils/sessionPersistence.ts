// Session Persistence - Maintains user session across page reloads and visibility changes
// Prevents unexpected logouts and preserves app state

export interface SessionData {
  userId: string;
  userEmail: string;
  userName: string;
  currentPage: string;
  loginTime: number;
  lastSeen: number;
  isAuthenticated: boolean;
}

export interface SessionConfig {
  storageKey: string;
  sessionTimeout: number; // Maximum session duration in milliseconds
  warningThreshold: number; // When to warn user about session expiry
}

class SessionPersistence {
  private config: SessionConfig;
  private sessionData: SessionData | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private expiryTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = {
      storageKey: config.storageKey || 'healqr_session_data',
      sessionTimeout: config.sessionTimeout || 24 * 60 * 60 * 1000, // 24 hours default
      warningThreshold: config.warningThreshold || 5 * 60 * 1000, // 5 minutes before expiry
    };

    // Bind methods
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleStorageChange = this.handleStorageChange.bind(this);
  }

  // Initialize session persistence
  public init(): void {
    console.log('🔐 Session Persistence initialized');

    // Load existing session
    this.loadSession();

    // Register event listeners
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('storage', this.handleStorageChange);

    // Start session monitoring
    this.startSessionMonitoring();
  }

  // Cleanup and remove listeners
  public destroy(): void {
    console.log('🛑 Session Persistence destroyed');

    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('storage', this.handleStorageChange);

    this.stopSessionMonitoring();
    this.saveSession();
  }

  // Create or update session
  public createSession(data: Partial<SessionData>): void {
    const now = Date.now();
    
    this.sessionData = {
      userId: data.userId || '',
      userEmail: data.userEmail || '',
      userName: data.userName || '',
      currentPage: data.currentPage || 'dashboard',
      loginTime: data.loginTime || now,
      lastSeen: now,
      isAuthenticated: data.isAuthenticated ?? true,
    };

    console.log('✅ Session created:', this.sessionData);
    this.saveSession();
    this.startSessionMonitoring();
  }

  // Update session data
  public updateSession(data: Partial<SessionData>): void {
    if (!this.sessionData) {
      console.warn('⚠️ No active session to update');
      return;
    }

    this.sessionData = {
      ...this.sessionData,
      ...data,
      lastSeen: Date.now(),
    };

    console.log('🔄 Session updated:', this.sessionData);
    this.saveSession();
  }

  // Get current session data
  public getSession(): SessionData | null {
    return this.sessionData ? { ...this.sessionData } : null;
  }

  // Check if session is valid
  public isSessionValid(): boolean {
    if (!this.sessionData) {
      return false;
    }

    const now = Date.now();
    const sessionAge = now - this.sessionData.loginTime;

    return (
      this.sessionData.isAuthenticated &&
      sessionAge < this.config.sessionTimeout
    );
  }

  // Get session age in milliseconds
  public getSessionAge(): number {
    if (!this.sessionData) {
      return 0;
    }
    return Date.now() - this.sessionData.loginTime;
  }

  // Get time until session expires
  public getTimeUntilExpiry(): number {
    if (!this.sessionData) {
      return 0;
    }
    const sessionAge = this.getSessionAge();
    return Math.max(0, this.config.sessionTimeout - sessionAge);
  }

  // Clear session data
  public clearSession(): void {
    console.log('🗑️ Session cleared');
    this.sessionData = null;
    this.stopSessionMonitoring();
    
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      console.error('❌ Failed to clear session:', error);
    }
  }

  // Save session to localStorage
  private saveSession(): void {
    if (!this.sessionData) {
      return;
    }

    try {
      // Update last seen timestamp
      this.sessionData.lastSeen = Date.now();
      
      localStorage.setItem(
        this.config.storageKey,
        JSON.stringify(this.sessionData)
      );
      console.log('💾 Session saved');
    } catch (error) {
      console.error('❌ Failed to save session:', error);
    }
  }

  // Load session from localStorage
  private loadSession(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        
        // Check if session is still valid
        const sessionAge = Date.now() - data.loginTime;
        if (sessionAge < this.config.sessionTimeout) {
          this.sessionData = data;
          console.log('📥 Session loaded:', this.sessionData);
        } else {
          console.log('⏰ Session expired, clearing...');
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('❌ Failed to load session:', error);
    }
  }

  // Handle page unload
  private handleBeforeUnload(event: BeforeUnloadEvent): void {
    console.log('💾 Saving session before page unload');
    this.saveSession();
    
    // Don't show confirmation dialog for session save
    // Only show if there are unsaved changes in forms, etc.
  }

  // Handle visibility change
  private handleVisibilityChange(): void {
    if (document.hidden) {
      console.log('📴 Page hidden - saving session');
      this.saveSession();
    } else {
      console.log('👁️ Page visible - checking session validity');
      this.loadSession();
      
      // Update last seen when page becomes visible
      if (this.sessionData) {
        this.sessionData.lastSeen = Date.now();
        this.saveSession();
      }
    }
  }

  // Handle storage changes from other tabs
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.config.storageKey) {
      console.log('🔄 Session updated in another tab');
      this.loadSession();
    }
  }

  // Start monitoring session expiry
  private startSessionMonitoring(): void {
    this.stopSessionMonitoring();

    if (!this.sessionData) {
      return;
    }

    const timeUntilWarning = this.getTimeUntilExpiry() - this.config.warningThreshold;
    const timeUntilExpiry = this.getTimeUntilExpiry();

    // Set warning timer
    if (timeUntilWarning > 0) {
      this.warningTimer = setTimeout(() => {
        console.warn('⚠️ Session will expire soon!');
        // You can trigger a UI notification here
      }, timeUntilWarning);
    }

    // Set expiry timer
    if (timeUntilExpiry > 0) {
      this.expiryTimer = setTimeout(() => {
        console.log('⏰ Session expired');
        this.clearSession();
        // You can trigger logout or redirect here
      }, timeUntilExpiry);
    }
  }

  // Stop monitoring session expiry
  private stopSessionMonitoring(): void {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  // Extend session timeout (useful for "Stay logged in" feature)
  public extendSession(): void {
    if (!this.sessionData) {
      console.warn('⚠️ No active session to extend');
      return;
    }

    console.log('⏰ Extending session');
    this.sessionData.loginTime = Date.now();
    this.saveSession();
    this.startSessionMonitoring();
  }
}

// Singleton instance
let sessionPersistenceInstance: SessionPersistence | null = null;

// Get or create session persistence instance
export function getSessionPersistence(config?: Partial<SessionConfig>): SessionPersistence {
  if (!sessionPersistenceInstance) {
    sessionPersistenceInstance = new SessionPersistence(config);
  }
  return sessionPersistenceInstance;
}

// Export class for custom instances
export { SessionPersistence };
