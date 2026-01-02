# Resources Directory

This directory contains application icons and assets.

## Required Files (before packaging)

- `icon.png` - Main app icon (512×512 PNG)
- `icon.ico` - Windows icon (generated from icon.png)  
- `icon.icns` - macOS icon (generated from icon.png)
- `tray-icon.png` - System tray icon (16×16 and 32×32)

## Generating Icons

You can use tools like:
- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder)
- [png2icons](https://www.npmjs.com/package/png2icons)

Or online converters to create .ico and .icns from the base PNG.
