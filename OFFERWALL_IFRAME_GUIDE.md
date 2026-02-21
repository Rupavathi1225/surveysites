# Offerwall iFrame Click Issues - Complete Guide

## Problem Summary
iFrames embedded in React components appear visually but clicks don't work. This is one of the most common issues when implementing offerwalls.

---

## Part 1: Why iFrame Clicks Don't Work

### Root Causes (in order of frequency):

#### 1. **CSS `pointer-events: none` (Most Common)**
The container holding the iframe has `pointer-events: none`, which blocks all clicks from reaching the iframe.

```scss
/* ❌ WRONG - Blocks clicks */
.iframe-container {
  pointer-events: none; /* This blocks iframe interaction */
}

/* ✅ CORRECT */
.iframe-container {
  pointer-events: auto; /* Allow all pointer events */
}
```

#### 2. **Z-Index Stacking Issues**
An overlay with higher z-index sits on top of the iframe, blocking clicks.

```scss
/* ❌ WRONG */
.container {
  z-index: 10;
}
.iframe-container {
  z-index: 5; /* Behind the overlay! */
}
.overlay {
  z-index: 20; /* Blocks iframes below */
}

/* ✅ CORRECT */
.dialog-backdrop {
  z-index: 50; /* High but not blocking dialog content */
}
.dialog-content {
  z-index: 51; /* Above backdrop */
}
.iframe-container {
  z-index: auto; /* Don't set if already in higher z-index context */
}
```

#### 3. **Iframe Not Getting Focus**
When iframe is embedded in a modal/dialog that manages focus, the iframe might not receive pointer events. Dialog components (especially shadcn/ui) may trap focus.

```tsx
/* ✅ SOLUTION: Dialog must have pointer-events-auto on content */
<DialogContent className="pointer-events-auto">
  <div className="overflow-hidden pointer-events-auto">
    <iframe className="pointer-events-auto" />
  </div>
</DialogContent>
```

#### 4. **CSS Overflow Hidden Without Proper Height**
If iframe parent has `overflow: hidden` but no defined height, iframe might be clipped.

```scss
/* ❌ WRONG */
.iframe-container {
  overflow: hidden;
  /* no height defined! iframe doesn't display */
}

/* ✅ CORRECT */
.iframe-container {
  overflow: hidden;
  height: 100%;
  width: 100%;
}
```

#### 5. **Inline Display Issues**
Iframes are inline elements by default. Margins/padding between inline elements can affect layout.

```scss
/* ✅ CORRECT */
iframe {
  display: block;
  width: 100%;
  height: 100%;
  border: none;
}
```

#### 6. **Provider-Side X-Frame-Options Header (Not Your Code)**
The offerwall provider's server returns `X-Frame-Options: DENY` or `X-Frame-Options: SAMEORIGIN`.

```
X-Frame-Options: DENY
→ Browser blocks iframe completely

X-Frame-Options: SAMEORIGIN
→ Only allows if provider domain matches your domain

X-Frame-Options: ALLOW-FROM https://yourdomain.com
→ Allows specific domains
```

**Check this in browser DevTools:**
- Open F12 > Network tab
- Reload
- Look for iframe request
- Check Response Headers for `X-Frame-Options`

---

## Part 2: CSS Solution - Complete Checklist

### The Complete CSS Pattern:

```tsx
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export const OfferWallModal = ({ isOpen, provider, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        Dialog content manages z-index automatically
        pointer-events-auto: CRITICAL - passes clicks through
      */}
      <DialogContent className="max-w-4xl h-[90vh] pointer-events-auto p-0">
        
        {/* Header with close button */}
        <div className="sticky top-0 bg-background border-b z-50 p-4">
          <h2>{provider.name}</h2>
          <button onClick={onClose} className="absolute top-4 right-4">×</button>
        </div>

        {/* 
          Iframe container - IMPORTANT PROPERTIES:
          
          1. flex-1 or flex-grow: Takes remaining space
          2. relative: For positioning content over it (loading indicator)
          3. overflow-hidden: Prevents container from scrolling
          4. pointer-events-auto: CRITICAL - lets clicks pass to iframe
        */}
        <div className="flex-1 relative overflow-hidden pointer-events-auto">
          
          {/* Optional: Loading overlay while iframe loads */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/5 flex items-center justify-center z-40">
              <div className="spinner" />
            </div>
          )}

          {/* 
            Iframe element - CRITICAL PROPERTIES:
            
            1. width: 100% / height: 100%: Fills container
            2. display: block: Removes inline spacing
            3. border: none: Removes default iframe border
            4. pointer-events-auto: Inline backup (CSS sometimes cached)
            5. sandbox: Proper permissions
            6. allow: Geolocation + payment permissions
          */}
          <iframe
            src={provider.iframe_url}
            title={provider.name}
            className="w-full h-full border-none pointer-events-auto"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            allow="geolocation; payment"
            onLoad={() => setIsLoading(false)}
            onError={() => setError(true)}
            style={{ display: 'block', pointerEvents: 'auto' }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### What NOT to do:

```tsx
/* ❌ DON'T: These block iframe clicks */

// 1. Parent with pointer-events-none
<div className="pointer-events-none">
  <iframe /> {/* Clicks don't work */}
</div>

// 2. Overlay covering iframe
<div className="absolute inset-0 z-50 bg-black/50">
  <iframe className="z-10" /> {/* Clicks blocked by overlay */}
</div>

// 3. Flex container without height on parent
<div className="flex">
  <iframe className="flex-1" /> {/* Iframe has no height */}
</div>

// 4. Dialog without pointer-events-auto
<Dialog>
  <DialogContent className="pointer-events-none"> {/* Blocks all clicks */}
    <iframe />
  </DialogContent>
</Dialog>

// 5. CSS that hides overflow without sizing
.iframe-wrapper {
  overflow: hidden; /* Without height: 100%, iframe can't display */
}
```

---

## Part 3: React JSX Structure

### Correct Component Structure:

```tsx
import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { AlertCircle, X } from 'lucide-react';

interface OfferWallIframeProps {
  provider: {
    id: string;
    name: string;
    iframe_url: string;
    image_url?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export const OfferWallIframe: React.FC<OfferWallIframeProps> = ({
  provider,
  isOpen,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    // Log for debugging
    console.log(`Iframe loaded: ${provider.name}`);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
    console.error(`Iframe failed to load: ${provider.name}`);
  };

  // Fallback to new tab if iframe fails
  const handleOpenInNewTab = () => {
    window.open(provider.iframe_url, '_blank', 'width=1200,height=800');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl h-[90vh] p-0 pointer-events-auto"
        // Disable close button since we have our own
        onPointerDownOutside={(e) => {
          // Allow close on backdrop click
          if ((e.target as HTMLElement).closest('[data-dialog-overlay]')) {
            onClose();
          }
        }}
      >
        {/* Header - sticky so it stays visible */}
        <DialogHeader className="sticky top-0 bg-background border-b z-50 p-4">
          <div className="flex items-center justify-between w-full gap-4">
            <DialogTitle className="flex items-center gap-3">
              {provider.image_url && (
                <img
                  src={provider.image_url}
                  alt={provider.name}
                  className="h-6 w-auto object-contain"
                />
              )}
              <span>{provider.name}</span>
            </DialogTitle>
            <DialogClose>
              <button className="rounded-sm opacity-70 hover:opacity-100 transition-opacity">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* Iframe container - flex takes remaining space */}
        <div className="flex-1 relative overflow-hidden pointer-events-auto">
          {/* Loading indicator */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-40">
              <div className="text-center space-y-3">
                <div className="h-8 w-8 rounded-full border-4 border-primary border-r-transparent animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Loading offerwall...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm font-medium">Failed to load offerwall</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  This may be due to geo-restrictions or provider blocking. Try opening in a new tab.
                </p>
                <button
                  onClick={handleOpenInNewTab}
                  className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded transition"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          {/* The actual iframe */}
          <iframe
            ref={iframeRef}
            src={provider.iframe_url}
            title={provider.name}
            className="w-full h-full border-none pointer-events-auto"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            // Sandbox attribute - see Part 4 for details
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
            // Additional permissions
            allow="geolocation; payment; usb"
            // Inline style backup for pointer-events
            style={{
              display: 'block',
              pointerEvents: 'auto',
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferWallIframe;
```

### Using in Your Main Component:

```tsx
import { useState } from 'react';
import OfferWallIframe from '@/components/OfferWallIframe';
import { Card, CardContent } from '@/components/ui/card';

export const DailySurveys = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providers, setProviders] = useState([...]);

  return (
    <>
      {/* Offerwall cards - click to open modal */}
      <div className="grid grid-cols-3 gap-2">
        {providers.map((p) => (
          <Card
            key={p.id}
            className="cursor-pointer hover:border-primary/50"
            onClick={() => setSelectedProvider(p)}
          >
            <CardContent className="p-3 text-center">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-10 object-contain" />
              ) : (
                <div className="h-10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary/60">{p.name[0]}</span>
                </div>
              )}
              <p className="font-medium text-[10px] truncate mt-2">{p.name}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal with iframe */}
      <OfferWallIframe
        provider={selectedProvider}
        isOpen={!!selectedProvider}
        onClose={() => setSelectedProvider(null)}
      />
    </>
  );
};
```

---

## Part 4: Sandbox Attribute Guide

The `sandbox` attribute restricts iframe capabilities for security. But too restrictive = broken functionality.

### Sandbox Attribute Options:

```html
<!-- MOST PERMISSIVE (but still secure for cross-origin) -->
<iframe 
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
/>
```

| Attribute | Effect | Needed For |
|-----------|--------|-----------|
| `allow-scripts` | Allow JavaScript | Almost all offerwalls - **REQUIRED** |
| `allow-same-origin` | Access session cookies | User tracking, logged-in content |
| `allow-popups` | Allow window.open() | Survey links in new tabs |
| `allow-popups-to-escape-sandbox` | Allow popups to remove sandbox restriction | Some providers need this |
| `allow-forms` | Allow form submissions | Survey forms, signup forms |
| `allow-top-navigation` | Allow navigation of parent window | ⚠️ Risky - provider can redirect main page |
| `allow-top-navigation-by-user-activation` | Navigation only on user click | Safer alternative to above |

### Recommended Configurations:

```tsx
// For Simple Offerwalls (Mustache, PollFish, etc.)
sandbox="allow-same-origin allow-scripts allow-popups allow-forms"

// For Complex Offerwalls (Awin, AdGate, CPA networks)
sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"

// For Payment-enabled Offerwalls (Stripe, PayPal)
sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"

// Minimum (if nothing else works)
sandbox="allow-scripts allow-popups allow-forms"

// Maximum (only if provider requires it)
sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-presentation"
```

### Testing Sandbox Issues:

1. **In Browser Console (F12 > Console)**, look for:
   ```
   Refused to frame 'https://...' because it violates the following Content Security Policy directive
   ```

2. **Try progressively adding permissions:**
   ```tsx
   // Start minimal
   sandbox="allow-scripts"
   // If popups fail, add:
   sandbox="allow-scripts allow-popups"
   // If forms fail, add:
   sandbox="allow-scripts allow-popups allow-forms"
   // Continue until it works
   ```

3. **Check provider documentation** for required sandbox attributes

---

## Part 5: When Providers Block Iframes (Provider-Side)

### X-Frame-Options Header

Providers can block their content from being embedded in iframes by sending HTTP headers:

```
X-Frame-Options: DENY
→ Cannot be embedded anywhere

X-Frame-Options: SAMEORIGIN
→ Can only be embedded on same domain (yourdomain.com)

X-Frame-Options: ALLOW-FROM https://yourdomain.com
→ Can be embedded on specific domains

Content-Security-Policy: frame-ancestors 'none'
→ Newer version of X-Frame-Options
```

### How to Check if Provider Blocks Iframes:

**Browser Method:**
1. Open F12 (Developer Tools)
2. Network tab
3. Reload page
4. Click on iframe request
5. Look at Response Headers
6. Search for `X-Frame-Options` or `Content-Security-Policy`

**Command Line (curl):**
```bash
curl -i https://provider-offerwall.com | grep -i "x-frame-options\|content-security-policy"
```

### Common Providers & Their Iframe Support:

| Provider | Supports Iframe | Method |
|----------|-----------------|--------|
| **Mustache** | ✅ Yes | Direct embed |
| **PollFish** | ✅ Yes | Direct embed |
| **Awin** | ✅ Yes | Direct embed |
| **Fyber** | ✅ Yes | Direct embed |
| **CPALead** | ✅ Yes | With user key |
| **AdGate** | ✅ Yes | Direct embed |
| **Bitlabs** | ✅ Yes | Direct embed |
| **TPAB** | ⚠️ Limited | Only with same-origin |
| **Instagc** | ⚠️ Restricted | Check settings |
| **Rewardtv** | ❌ No | New tab only |

### What to Do if Provider Blocks Iframes:

```tsx
// Option 1: Try with allow-top-navigation (risky)
<iframe sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation" />

// Option 2: Request provider to whitelist your domain
// Contact provider support with your domain: https://yourdomain.com

// Option 3: Use JSONP or proxy endpoint
// Backend creates endpoint that can embed provider content

// Option 4: Fallback to new tab opens
<Button onClick={() => window.open(provider.url, '_blank')}>
  Open in New Tab
</Button>
```

---

## Part 6: Industry Best Practices for Offerwalls

### 1. **iframe vs. New Tab - When to Use Each**

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| **iframe** | Native UI, tracking easy, user stays on app | Geo restrictions, provider compatibility issues | Premium providers (Mustache, PollFish) |
| **New Tab** | No restrictions, works with all providers | User leaves your app, hard to track completion | Secondary offerwalls, fallback |
| **Hybrid** | Best of both | Slightly more code | Recommended approach |

### 2. **Recommended Implementation (Hybrid Approach)**

```tsx
export const OfferWallCard = ({ provider }) => {
  const [useIframe, setUseIframe] = useState(true);

  // Try iframe first, fallback to new tab on error
  const handleClick = async () => {
    if (useIframe && provider.iframe_url) {
      setShowIframeModal(true);
    } else {
      // Fallback: open in new tab
      window.open(provider.iframe_url || provider.url, '_blank');
    }
  };

  return (
    <>
      <Card onClick={handleClick} className="cursor-pointer">
        <CardContent className="p-3">
          <img src={provider.image_url} alt={provider.name} />
          <p>{provider.name}</p>
        </CardContent>
      </Card>

      {/* Iframe modal with error handling */}
      <OfferWallIframe
        provider={provider}
        isOpen={showIframeModal}
        onClose={() => setShowIframeModal(false)}
        onFrameError={() => {
          // If iframe fails, set to always use new tab
          setUseIframe(false);
          // And open in new tab instead
          window.open(provider.iframe_url, '_blank');
        }}
      />
    </>
  );
};
```

### 3. **Tracking & Analytics**

```tsx
// Track when user opens offerwall
const trackOfferClick = async (provider) => {
  await supabase.from('offer_clicks').insert({
    user_id: profile.id,
    provider_id: provider.id,
    method: 'iframe', // or 'new_tab'
    timestamp: new Date(),
  });
};

// Track completion via postback
// Provider sends: /api/postback?user_id={user_id}&offer_id={offer_id}&amount={amount}
// This updates user points in your database
```

### 4. **Mobile Considerations**

```tsx
<Dialog>
  <DialogContent 
    className={`
      ${isMobile ? 'max-w-full h-screen' : 'max-w-4xl h-[90vh]'}
      pointer-events-auto p-0
    `}
  >
    {/* Content */}
  </DialogContent>
</Dialog>
```

### 5. **Performance Optimization**

```tsx
// Lazy load iframe only when dialog opens
const [iframeUrl, setIframeUrl] = useState<string | null>(null);

const handleOpenDialog = () => {
  // Generate iframe URL with user_id when opening
  const url = provider.iframe_url.replace('{user_id}', userId);
  setIframeUrl(url);
  setIsOpen(true);
};

// Only render iframe when URL is set
{iframeUrl && (
  <iframe src={iframeUrl} />
)}
```

### 6. **Error Recovery**

```tsx
// Retry loading iframe
const handleIframeError = () => {
  if (retryCount < 3) {
    setTimeout(() => {
      iframeRef.current?.src = provider.iframe_url;
      setRetryCount(retryCount + 1);
    }, 2000);
  } else {
    // After 3 retries, offer new tab option
    setShowNewTabOption(true);
  }
};
```

### 7. **Deep Linking (if provider supports)**

Some providers allow deep linking to specific offers:

```tsx
// Open specific offer within provider
window.open(
  `${provider.iframe_url}?offer_id=${offerId}&user_id=${userId}`,
  '_blank'
);
```

### 8. **Best Practices Checklist**

- ✅ User sees clear loading indicator while iframe loads
- ✅ Iframe takes up most of viewport (90vh minimum)
- ✅ Easy close button (X in top right)
- ✅ Fallback to new tab if iframe fails
- ✅ Track all offer opens and completions
- ✅ Test on mobile and desktop
- ✅ Test with slow network (DevTools throttling)
- ✅ Proper error messages if provider blocks iframe
- ✅ Support both same-origin and cross-origin iframes
- ✅ Sanitize user_id and other interpolated values

---

## Debugging Checklist

When iframe clicks still don't work after applying this guide:

### 1. Check CSS
```javascript
// In browser console (F12)
const iframe = document.querySelector('iframe');
const style = window.getComputedStyle(iframe);

console.log('pointer-events:', style.pointerEvents); // Should be 'auto'
console.log('z-index:', style.zIndex);
console.log('width:', style.width);   // Should be '100%'
console.log('height:', style.height); // Should be full

// Check parent container
const parent = iframe.parentElement;
const parentStyle = window.getComputedStyle(parent);
console.log('parent pointer-events:', parentStyle.pointerEvents); // Should be 'auto'
console.log('parent overflow:', parentStyle.overflow); // Should be 'auto'/'visible'
```

### 2. Check Provider Headers
```javascript
// Network tab → iframe request → Response Headers
// Look for:
// X-Frame-Options: DENY
// Content-Security-Policy: frame-ancestors 'none'
```

### 3. Check For JavaScript Errors
```javascript
// In iframe console (if you can access it):
// Some providers log errors when iframe fails
```

### 4. Test Sandbox Attribute
```html
<!-- Progressively increase permissions until clicks work -->
<iframe sandbox="allow-scripts"></iframe>
<iframe sandbox="allow-scripts allow-same-origin"></iframe>
<iframe sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
<iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms"></iframe>
```

### 5. Check for React Event Delegation Issues
```tsx
// If using event delegation, make sure it doesn't interfere:
<div
  onClick={(e) => {
    // Don't stop iframe clicks
    if (e.target !== iframe) {
      handleParentClick();
    }
  }}
>
  <iframe />
</div>
```

### 6. Verify Resize Observer Isn't Blocking
```css
/* If using ResizeObserver or similar, ensure it doesn't mask iframe */
.iframe-container {
  position: relative; /* Allows absolute overlays */
}

/* Overlays (like drag handles) should be pointer-events-none */
.drag-handle {
  pointer-events: none;
}
```

---

## Summary

| Issue | Solution |
|-------|----------|
| Clicks don't work | Add `pointer-events-auto` to iframe & parent |
| Z-index problems | Let Dialog handle z-index, don't override |
| Provider blocks iframe | Request whitelist or use new tab fallback |
| Popup doesn't work | Add `allow-popups` to sandbox |
| Form can't submit | Add `allow-forms` to sandbox |
| Tracking fails | Use window.open fallback or webhook |
| Mobile layout breaks | Use responsive dialog height: `h-screen \| h-[90vh]` |

