# Traditional Hosting Deployment Script
# This script builds your project and prepares files for traditional hosting upload

Write-Host "🏠 Traditional Hosting Deployment Helper" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Warning: .env file not found!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create a .env file with:" -ForegroundColor Yellow
    Write-Host "  VITE_SUPABASE_URL=your_supabase_url" -ForegroundColor Gray
    Write-Host "  VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key" -ForegroundColor Gray
    Write-Host "  VITE_SITE_URL=https://yourdomain.com" -ForegroundColor Gray
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

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build successful!" -ForegroundColor Green
Write-Host ""

# Check if dist folder exists
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: dist folder not found!" -ForegroundColor Red
    exit 1
}

# Copy .htaccess to dist folder
Write-Host "📄 Copying server configuration files..." -ForegroundColor Cyan
if (Test-Path ".htaccess") {
    Copy-Item ".htaccess" -Destination "dist\.htaccess" -Force
    Write-Host "✓ .htaccess copied" -ForegroundColor Green
} else {
    Write-Host "⚠️  .htaccess not found in project root" -ForegroundColor Yellow
}

if (Test-Path "web.config") {
    Copy-Item "web.config" -Destination "dist\web.config" -Force
    Write-Host "✓ web.config copied" -ForegroundColor Green
}

# Calculate folder size
$distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "📊 Build Statistics:" -ForegroundColor Cyan
Write-Host "   Folder size: $([math]::Round($distSize, 2)) MB" -ForegroundColor White
$fileCount = (Get-ChildItem -Path "dist" -Recurse -File).Count
Write-Host "   Total files: $fileCount" -ForegroundColor White

Write-Host ""
Write-Host "📁 Your website files are ready in the 'dist' folder" -ForegroundColor Green
Write-Host ""

# Ask if user wants to create a zip file
$createZip = Read-Host "Create a ZIP file for easy upload? (y/n)"
if ($createZip -eq "y") {
    $zipName = "sasta-bazar-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
    Write-Host ""
    Write-Host "📦 Creating ZIP file..." -ForegroundColor Cyan
    Compress-Archive -Path "dist\*" -DestinationPath $zipName -Force
    Write-Host "✓ ZIP file created: $zipName" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now upload this ZIP file to your hosting and extract it in the web root." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Connect to your hosting via FTP/SFTP or cPanel File Manager" -ForegroundColor White
Write-Host "2. Navigate to your web root (usually public_html, www, or htdocs)" -ForegroundColor White
Write-Host "3. Upload ALL contents from the 'dist' folder" -ForegroundColor White
Write-Host "4. Make sure .htaccess (Apache) or web.config (IIS) is uploaded" -ForegroundColor White
Write-Host "5. Set file permissions (644 for files, 755 for directories on Linux)" -ForegroundColor White
Write-Host "6. Enable SSL/HTTPS in your hosting control panel" -ForegroundColor White
Write-Host "7. Test your website at https://yourdomain.com" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see TRADITIONAL_HOSTING.md" -ForegroundColor Cyan
Write-Host ""
