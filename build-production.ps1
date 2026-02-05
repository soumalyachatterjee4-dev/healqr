# HealQR Production Build Script
# Prevents OOM errors by setting Node.js memory limit to 8GB

Write-Host "🏗️  Building HealQR for Production..." -ForegroundColor Green
Write-Host "📊 Setting Node.js memory limit to 8GB..." -ForegroundColor Yellow

# Set Node.js memory options (8GB for production builds)
$env:NODE_OPTIONS="--max-old-space-size=8192"

Write-Host "✅ Memory limit set!" -ForegroundColor Green
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Cyan

# Clean and build
npm run build:clean

Write-Host ""
Write-Host "✨ Build complete! Check the 'dist' folder." -ForegroundColor Green
Write-Host "📦 To deploy: npm run deploy" -ForegroundColor Yellow
