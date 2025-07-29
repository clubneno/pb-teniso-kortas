# PWA Testing Instructions for PB Tennis

## Quick Verification Checklist

### ✅ Basic PWA Files Check
1. Visit: `https://your-domain.com/manifest.json` - Should show app metadata
2. Visit: `https://your-domain.com/sw.js` - Should show service worker code  
3. Visit: `https://your-domain.com/icons/icon-192x192.png` - Should show tennis ball icon

### ✅ Developer Tools Check
1. Open DevTools (F12)
2. Go to **Application** tab
3. Check **Manifest** section:
   - Name: "PB Teniso Kortas"
   - Short name: "PB Tennis" 
   - Theme color: #2e6b4a
   - Icons: 8 sizes (72px to 512px)

4. Check **Service Workers** section:
   - Status: "activated and is running"
   - Scope: your domain
   - No errors

### ✅ Installation Test (Desktop)
1. **Chrome/Edge**: Look for install icon (⊕) in address bar
2. **Firefox**: Menu → "Install this site as an app"
3. After install: App opens in standalone window
4. Check: No browser address bar or bookmarks

### ✅ Installation Test (Mobile)
**Android Chrome:**
- Install banner appears automatically
- Or: Menu (⋮) → "Add to Home Screen"

**iOS Safari:**
- Share button → "Add to Home Screen"
- Icon appears on home screen

### ✅ Offline Test
1. Install the app
2. Open Network tab in DevTools
3. Check "Offline" checkbox
4. Refresh app - should still work
5. Navigate between pages - should work offline
6. Check console for "PWA: Cached" messages

### ✅ Performance Test
1. Run Lighthouse audit (DevTools → Lighthouse)
2. Check PWA score should be 100/100
3. Look for green checkmarks:
   - ✓ Installable
   - ✓ PWA-optimized
   - ✓ Service worker registered

### ✅ Features Test
**App Shortcuts:**
- Right-click installed app icon
- Should show "Naujas rezervacijos" and "Mano rezervacijos"

**Push Notifications:**
- Allow notifications when prompted
- Should work for booking confirmations

**Offline Sync:**
- Make reservation while offline
- Go online - should sync automatically

## Troubleshooting

**Install button not showing?**
- Check manifest.json is valid
- Verify HTTPS connection
- Clear browser cache and reload

**Service worker not working?**
- Check browser console for errors
- Verify sw.js is accessible
- Hard refresh (Ctrl+Shift+R)

**App not caching offline?**
- Check Network tab shows cached responses
- Verify service worker is active
- Test with slow/offline connection

## Success Indicators
✅ Install prompt appears on first visit
✅ App works completely offline  
✅ Lighthouse PWA score: 100/100
✅ App behaves like native mobile app
✅ Tennis ball icons throughout
✅ Lithuanian interface throughout