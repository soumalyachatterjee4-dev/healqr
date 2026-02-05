# 🚀 HealQR Quick Start Guide

## ✅ Project Successfully Restored!

**Source**: healqrxx (Desktop) - Latest version (Jan 30, 2026)  
**Destination**: C:\Projects\healqr  
**Status**: Ready to develop!

---

## 🎯 Quick Commands

### Start Development Server
```powershell
.\start-dev.ps1
```
OR
```powershell
npm run dev
```

### Build for Production (OOM-Safe)
```powershell
.\build-production.ps1
```
OR
```powershell
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
```

### Deploy to Firebase
```powershell
npm run deploy
```

---

## 🔧 OOM Issue - SOLVED!

### What was causing it?
- Large React + TypeScript project
- Vite build process consuming too much memory
- Default Node.js memory limit too low

### How it's fixed?
1. **.npmrc** file with 4GB memory allocation
2. **Helper scripts** (start-dev.ps1, build-production.ps1)
3. **Build script** uses 8GB for production builds

### If you still get OOM:
```powershell
# Increase to 12GB or 16GB
$env:NODE_OPTIONS="--max-old-space-size=12288"
npm run build
```

---

## 📁 Project Info

- **Framework**: React 18 + TypeScript + Vite 5
- **UI**: Radix UI + Tailwind CSS 4
- **Backend**: Firebase (Firestore + Functions + Hosting)
- **Version**: 1.0.7
- **Node**: v22.18.0
- **npm**: v10.9.3

---

## 📝 Latest Git Commits

```
d027141 - Patient Dashboard: Fixed Live Tracker + Notifications
525274f - Add health tips to patient dashboard pages
76b541b - Backup before removing appointments fallback search
1c03e49 - Doctor Module Complete: Comprehensive Documentation
33f18a2 - Virtual QR system with badge features
7fff80f - Unified booking ID format for walk-in patients
```

---

## 🌐 Website

www.healqr.com

---

## 💡 Tips

1. **Always use the helper scripts** to avoid OOM errors
2. **Check .firebaserc** to ensure correct Firebase project
3. **Run `firebase login`** if deploy fails
4. **Use `npm run build:clean`** for fresh builds

---

## 📚 Documentation

- [Setup Instructions](README_SETUP.md)
- [Doctor Module](DOCTOR_MODULE_DOCUMENTATION.md)
- [Firestore Rules](firestore.rules)
- [Firebase Config](firebase.json)

---

**Ready to code? Run `.\start-dev.ps1` and open http://localhost:5173** 🎉
