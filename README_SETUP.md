# HealQR Setup Instructions

## Project Restored from: healqrxx (Desktop)
**Date**: January 30, 2026
**Latest Commit**: Patient Dashboard with Live Tracker + Notifications

## OOM (Out of Memory) Issue - Fixed!

The project has been configured with increased Node.js memory allocation to prevent OOM errors.

### Quick Start

1. **Install Dependencies** (if needed):
```bash
npm install
```

2. **Run Development Server**:
```bash
npm run dev
```

3. **Build Project** (with increased memory):
```bash
$env:NODE_OPTIONS="--max-old-space-size=4096"; npm run build
```

4. **Deploy to Firebase**:
```bash
npm run deploy
```

## Memory Configuration

- `.npmrc` file added with `--max-old-space-size=4096` (4GB memory limit)
- This prevents OOM errors during build and development

## Alternative Build Commands

If you still face OOM issues, try:

```bash
# PowerShell
$env:NODE_OPTIONS="--max-old-space-size=8192"; npm run build

# Or use the clean build
npm run build:clean
```

## Project Structure

- **Frontend**: React + TypeScript + Vite
- **Backend**: Firebase Functions
- **Database**: Firestore
- **Hosting**: Firebase Hosting
- **Version**: 1.0.7

## Latest Features (from git log)

- Patient Dashboard with Live Tracker
- Notifications connected to real Firestore data
- Composite indexes configured
- Firebase hosting MIME type errors fixed
- Health tips on patient dashboard
- Doctor Module Complete
- Virtual QR system with badges
- Walk-in booking system

## Firebase Configuration

Make sure you have:
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in: `firebase login`
- Project connected: Check `.firebaserc`

## Troubleshooting

### OOM Error During Build
```bash
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build:clean
```

### Port Already in Use
```bash
# Kill process on port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Firebase Deploy Issues
```bash
firebase login --reauth
firebase use --add
```

## Environment

- Node.js: Recommended v18+ or v20+
- npm: Latest version
- Firebase CLI: Latest version

## Support

For issues, check:
- [Documentation](DOCTOR_MODULE_DOCUMENTATION.md)
- [Firebase Console](https://console.firebase.google.com)
- Project website: www.healqr.com
