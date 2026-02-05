# HealQR Development Server Starter
# Prevents OOM errors by setting Node.js memory limit

Write-Host "🚀 Starting HealQR Development Server..." -ForegroundColor Green
Write-Host "📊 Setting Node.js memory limit to 4GB..." -ForegroundColor Yellow

# Set Node.js memory options
$env:NODE_OPTIONS="--max-old-space-size=4096"

Write-Host "✅ Memory limit set!" -ForegroundColor Green
Write-Host "🌐 Starting Vite dev server..." -ForegroundColor Cyan
Write-Host ""

# Start the development server
npm run dev
