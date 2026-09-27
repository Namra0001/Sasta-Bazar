# Sasta Bazar Deployment Script
# This script helps you build and prepare your website for deployment

Write-Host "🚀 Sasta Bazar Deployment Helper" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host "Creating .env.example for reference..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create a .env file with:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=your_supabase_url" -ForegroundColor Gray
    Write-Host "  VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key" -ForegroundColor Gray
    Write-Host "  VITE_SITE_URL=https://sasta-bazar.com" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit
    }
}

# Install dependencies if needed
Write-Host "📦 Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✓ Dependencies already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔨 Building production version..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Build successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Your website files are in the 'dist' folder" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. For Vercel: Run 'vercel' command" -ForegroundColor White
    Write-Host "2. For Netlify: Run 'netlify deploy --prod'" -ForegroundColor White
    Write-Host "3. For Traditional Hosting:" -ForegroundColor White
    Write-Host "   - Upload 'dist' folder contents to your web server root" -ForegroundColor Gray
    Write-Host "   - Upload '.htaccess' (Apache) or 'web.config' (IIS) to root" -ForegroundColor Gray
    Write-Host "   - See TRADITIONAL_HOSTING.md for complete guide" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📖 See TRADITIONAL_HOSTING.md for traditional hosting details" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}
