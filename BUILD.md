# Chrome Extension Build Guide

This guide explains how to build and package the AsmineGpt Chrome Extension for development and release.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation
```bash
npm install
```

## 📦 Build Commands

### Development Build
```bash
npm run build:dev
```
- Copies all files without minification
- Preserves console.log statements for debugging
- Faster build time

### Production Build
```bash
npm run build
```
- Minifies JavaScript and CSS files
- Removes console.log statements
- Optimizes for size and performance
- Creates a `dist/` directory with the built extension

### Release Build
```bash
npm run build:release
```
- Runs production build
- Creates a zip file ready for Chrome Web Store submission
- Output: `dist/asminegpt-chrome-extension-v1.0.0.zip`

### Development with Watch Mode
```bash
npm run dev
```
- Builds in development mode
- Watches for file changes and rebuilds automatically
- Perfect for development workflow

## 🔧 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development build + watch mode |
| `npm run build` | Production build |
| `npm run build:dev` | Development build only |
| `npm run build:prod` | Production build only |
| `npm run build:release` | Production build + zip package |
| `npm run clean` | Remove dist directory |
| `npm run watch` | Watch files and rebuild on changes |
| `npm run zip` | Create zip package from existing dist |
| `npm run lint` | Check code quality with ESLint |
| `npm run lint:fix` | Fix ESLint issues automatically |

## 📁 Build Output

After running a build, you'll find:

```
dist/
├── manifest.json          # Processed manifest with build info
├── background.js          # Minified background script
├── content_chatgpt.js     # Minified content script
├── slider.js             # Minified main slider script
├── wooAuth.js            # Minified WooCommerce auth
├── modal.js              # Minified modal script
├── styles.css            # Minified styles
├── slider.css            # Minified slider styles
├── modal.css             # Minified modal styles
├── slider.html           # HTML file
├── return.html           # Return page
├── icons/                # Extension icons
└── build-info.json       # Build metadata
```

## 🎯 Chrome Web Store Submission

### 1. Build for Release
```bash
npm run build:release
```

### 2. Upload to Chrome Web Store
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click "Add new item"
3. Upload the generated zip file: `dist/asminegpt-chrome-extension-v1.0.0.zip`
4. Fill in store listing details
5. Submit for review

### 3. Required Store Assets
- **Icon**: 128x128 PNG (already included in `icons/`)
- **Screenshots**: 1280x800 or 640x400 PNG
- **Description**: Clear description of features
- **Privacy Policy**: Required for extensions with permissions

## 🔍 Development Workflow

### 1. Start Development
```bash
npm run dev
```

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` directory
5. The extension will auto-reload when you make changes

### 3. Debug and Test
- Use Chrome DevTools for debugging
- Check the extension's background page
- Test on ChatGPT.com
- Verify WooCommerce integration

## 🛠️ Build Configuration

### Customizing Build Process

Edit `build/build.js` to modify:

- **Files to copy**: Update `filesToCopy` array
- **Files to minify**: Update `filesToMinify` and `cssToMinify` arrays
- **Minification settings**: Modify Terser options
- **Build output**: Change `distDir` path

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `npm_package_version`: Automatically set from package.json

## 📊 Build Statistics

The build process provides detailed statistics:

```
🚀 Building Chrome Extension in PRODUCTION mode...
🧹 Cleaning dist directory...
📁 Copying files...
  ✓ Copied file: manifest.json
  ✓ Copied directory: icons/
🔧 Minifying JavaScript files...
  ✓ Minified: slider.js (119.0KB → 45.2KB)
  ✓ Minified: background.js (1.5KB → 0.8KB)
🎨 Minifying CSS files...
  ✓ Minified: styles.css (18.0KB → 12.3KB)
📋 Processing manifest.json...
  ✓ Manifest processed
📝 Generating build info...
  ✓ Build info generated

✅ Build completed successfully!
📦 Extension ready in: dist/
```

## 🚨 Troubleshooting

### Common Issues

1. **Build fails with "module not found"**
   ```bash
   npm install
   ```

2. **Extension doesn't load in Chrome**
   - Check `dist/` directory exists
   - Verify all required files are present
   - Check Chrome DevTools console for errors

3. **Minification errors**
   - Check for syntax errors in source files
   - Run `npm run lint` to find issues
   - Use development build for debugging

4. **Zip file too large**
   - Check for unnecessary files in `dist/`
   - Optimize images in `icons/`
   - Remove debug files

### Getting Help

1. Check the console output for specific error messages
2. Verify all dependencies are installed
3. Ensure Node.js version is compatible
4. Check file permissions in the project directory

## 📈 Performance Optimization

### Before Release
- [ ] Run production build
- [ ] Test extension thoroughly
- [ ] Verify all features work
- [ ] Check file sizes are reasonable
- [ ] Validate manifest.json
- [ ] Test on different Chrome versions

### Best Practices
- Keep bundle size under 10MB for Chrome Web Store
- Use efficient image formats (PNG for icons, WebP for screenshots)
- Minimize API calls and optimize network requests
- Follow Chrome extension best practices
- Test on multiple devices and browsers

## 🔄 Version Management

### Updating Version
1. Update version in `package.json`
2. Update version in `manifest.json`
3. Run `npm run build:release`
4. Upload new zip to Chrome Web Store

### Version Format
- Use semantic versioning (e.g., 1.0.0, 1.0.1, 1.1.0)
- Major.Minor.Patch format
- Update patch for bug fixes
- Update minor for new features
- Update major for breaking changes 