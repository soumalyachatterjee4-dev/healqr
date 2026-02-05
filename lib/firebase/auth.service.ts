/**
 * Firebase Authentication Service
 * 
 * Handles all authentication-related operations:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Email verification
 * - Password reset
 * - Sign out
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { COLLECTIONS, Doctor } from './collections';

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export class AuthService {
  /**
   * Sign up a new doctor with email and password
   */
  static async signUpDoctor(
    email: string,
    password: string,
    doctorData: {
      fullName: string;
      phoneNumber: string;
      specialty?: string;
    }
  ): Promise<{ user: User; doctorCode: string }> {
    // Check if Firebase is initialized
    if (!auth || !db) {
      throw new Error('Firebase not configured. Using DEMO MODE. Please configure Firebase credentials to enable authentication.');
    }

    try {
      // 1. Create Firebase Auth user
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2. Generate unique 6-digit doctor code
      const doctorCode = await this.generateUniqueDoctorCode();

      // 3. Create doctor document in Firestore
      const doctorDoc: Partial<Doctor> = {
        id: user.uid,
        email: email,
        phoneNumber: doctorData.phoneNumber,
        fullName: doctorData.fullName,
        doctorCode: doctorCode,
        specialty: doctorData.specialty || '',
        
        // Initialize chambers (inactive by default)
        chambers: {
          main: {
            active: false,
            name: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            consultationFee: 0,
            schedule: {},
          },
        },
        
        // Starter plan (100 bookings free)
        subscription: {
          plan: 'starter',
          status: 'active',
          bookingsLimit: 100,
          bookingsUsed: 0,
          topUpVault: 0,
          renewalDate: new Date().getDate(),
          nextRenewalDate: this.calculateNextRenewalDate(),
          billingCycle: 'monthly',
        },
        
        // No add-ons initially
        activeAddons: [],
        addonExpiry: {},
        
        // Initialize stats
        stats: {
          totalBookings: 0,
          totalRevenue: 0,
          averageRating: 0,
          totalReviews: 0,
        },
        
        // Default settings
        settings: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
          language: 'english',
        },
        
        // Metadata
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
        isActive: true,
        isVerified: false,
      };

      // Save to Firestore
      await setDoc(doc(db, COLLECTIONS.DOCTORS, user.uid), doctorDoc);

      // 4. Update user profile display name
      await updateProfile(user, {
        displayName: doctorData.fullName,
      });

      // 5. Send email verification
      await sendEmailVerification(user);

      return { user, doctorCode };
      
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in a doctor with email and password
   */
  static async signInDoctor(
    email: string,
    password: string
  ): Promise<{ user: User; doctor: Doctor }> {
    // Check if Firebase is initialized
    if (!auth || !db) {
      throw new Error('Firebase not configured. Using DEMO MODE. Please configure Firebase credentials to enable authentication.');
    }

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch doctor data from Firestore
      const doctorDoc = await getDoc(doc(db, COLLECTIONS.DOCTORS, user.uid));
      
      if (!doctorDoc.exists()) {
        throw new Error('Doctor profile not found. Please contact support.');
      }

      const doctor = doctorDoc.data() as Doctor;

      // 3. Update last login timestamp
      await setDoc(
        doc(db, COLLECTIONS.DOCTORS, user.uid),
        { lastLogin: serverTimestamp() },
        { merge: true }
      );

      return { user, doctor };
      
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out the current user
   */
  static async signOutUser(): Promise<void> {
    if (!auth) {
      // Silent fallback - no warning needed
      return;
    }

    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(email: string): Promise<void> {
    if (!auth) {
      throw new Error('Firebase not configured. Cannot send password reset email in DEMO MODE.');
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Resend email verification
   */
  static async resendEmailVerification(): Promise<void> {
    if (!auth) {
      throw new Error('Firebase not configured. Cannot send verification email in DEMO MODE.');
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No user logged in');
      }

      if (user.emailVerified) {
        throw new Error('Email already verified');
      }

      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('❌ Email verification error:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Generate a unique 6-digit doctor code
   */
  private static async generateUniqueDoctorCode(): Promise<string> {
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      // Generate random 6-digit number
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Check if code already exists
      const exists = await this.checkDoctorCodeExists(code);
      
      if (!exists) {
        return code;
      }
    }
    
    throw new Error('Failed to generate unique doctor code. Please try again.');
  }

  /**
   * Check if a doctor code already exists
   */
  private static async checkDoctorCodeExists(code: string): Promise<boolean> {
    // In production, use Firestore query to check
    // For now, we'll assume it doesn't exist (low collision probability)
    // TODO: Implement Firestore query when ready
    return false;
  }

  /**
   * Calculate next renewal date (30 days from now)
   */
  private static calculateNextRenewalDate(): any {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  }

  /**
   * Handle authentication errors and provide user-friendly messages
   */
  private static handleAuthError(error: any): Error {
    const errorCode = error.code;
    let message = 'An error occurred. Please try again.';

    switch (errorCode) {
      case 'auth/email-already-in-use':
        message = 'This email is already registered. Please sign in instead.';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address. Please check and try again.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters long.';
        break;
      case 'auth/user-not-found':
        message = 'No account found with this email. Please sign up first.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password. Please try again.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your internet connection.';
        break;
      case 'auth/user-disabled':
        message = 'Your account has been disabled. Please contact support.';
        break;
      case 'auth/api-key-not-valid':
      case 'auth/invalid-api-key':
        message = 'Firebase not configured properly. Using DEMO MODE. Please configure Firebase credentials.';
        break;
      default:
        message = error.message || message;
    }

    return new Error(message);
  }

  /**
   * Get current authenticated user
   */
  static getCurrentUser(): User | null {
    if (!auth) return null;
    return auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    if (!auth) return false;
    return !!auth.currentUser;
  }

  /**
   * Get current user's ID token (for API calls)
   */
  static async getIdToken(): Promise<string | null> {
    if (!auth) return null;
    const user = auth.currentUser;
    if (!user) return null;
    
    return await user.getIdToken();
  }
}

// ============================================
// AUTH STATE LISTENER
// ============================================

/**
 * Listen to authentication state changes
 * Usage: onAuthStateChange((user) => { ... })
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    // Firebase not configured - immediately call callback with null
    callback(null);
    // Return a no-op unsubscribe function
    return () => {};
  }
  return auth.onAuthStateChanged(callback);
};
