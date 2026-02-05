# HealQR Assets

This folder contains image assets used throughout the HealQR application.

## Asset Files

1. **healqr-logo.svg** - Main HealQR logo used across the platform
   - Used in: LandingPage, DashboardSidebar, AdminSidebar, Login, SignUp, PrivacyPolicy, TermsOfService, RefundPolicy, AdminLogin
   - Format: SVG (scalable vector graphics)

2. **doctors-hero.svg** - Hero image for landing page
   - Used in: LandingPage
   - Format: SVG (scalable vector graphics)

3. **logo-preview.svg** - Logo preview component
   - Used in: LogoPreview
   - Format: SVG (scalable vector graphics)

## Replacing Placeholder Images

The current files are SVG placeholders. To replace them with actual HealQR branding:

### Option 1: Replace with PNG files
1. Export your logo and images from Figma as PNG
2. Rename them to match the filenames above (change .svg to .png)
3. Update the imports in components to use .png extension
4. Recommended dimensions:
   - healqr-logo.png: 200x60px (transparent background)
   - doctors-hero.png: 1200x800px
   - logo-preview.png: 300x100px

### Option 2: Replace with SVG files (Recommended)
1. Export your logo and images from Figma as SVG
2. Save them with the exact filenames listed above
3. Place them in this `/assets/` folder
4. SVG files scale perfectly at any size

## Image Formats

- Current format: SVG (Scalable Vector Graphics)
- Benefits of SVG:
  - Perfect scaling at any resolution
  - Small file size
  - Can be edited in code
  - Ideal for logos and icons
- Alternative: PNG format for photos and complex graphics
- Optimize images before adding to reduce bundle size