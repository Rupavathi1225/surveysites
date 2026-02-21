# Iframe Clicks Not Working - Troubleshooting Guide

## Quick Diagnostic Flow

```
Iframe clicks don't work?
│
├─ Step 1: Check if iframe is visible
│  └─ Yes → Step 2
│  └─ No → Check CSS height/width
│
├─ Step 2: Can you see the iframe content?
│  └─ Yes → Step 3
│  └─ No → Check X-Frame-Options header
│
├─ Step 3: Try clicking inside iframe
│  └─ Nothing happens → Step 4
│  └─ Works → Congratulations! 🎉
│
└─ Step 4: Apply fixes below
```

---

## Fix #1: Check CSS `pointer-events` Property

### Symptom
Iframe is visible but clicks don't work - cursor doesn't change.

### Quick Test (Browser Console)
```javascript
// Open DevTools (F12)
// Paste this in Console tab:

const iframe = document.querySelector('iframe');
const style = window.getComputedStyle(iframe);

console.log('Iframe pointer-events:', style.pointerEvents);
console.log('Parent pointer-events:', window.getComputedStyle(iframe.parentElement).pointerEvents);

// Both should say 'auto'
```

### Solution

**Check parent container:**
```tsx
// ❌ WRONG
<div className="pointer-events-none">
  <iframe />
</div>

// ✅ CORRECT
<div className="pointer-events-auto">
  <iframe className="pointer-events-auto" />
</div>
```

**Check inline styles:**
```tsx
// ❌ WRONG
<iframe style={{ pointerEvents: 'none' }} />

// ✅ CORRECT
<iframe 
  style={{ 
    pointerEvents: 'auto',
    display: 'block',
    width: '100%',
    height: '100%'
  }} 
/>
```

**Check Tailwind classes:**
```tsx
// ❌ WRONG
<iframe className="pointer-events-none" />

// ✅ CORRECT
<iframe className="pointer-events-auto" />
```

---

## Fix #2: Z-Index Overlay Blocking Clicks

### Symptom
Iframe content visible but there's an invisible layer on top blocking clicks.

### Quick Test
```javascript
// In console:
const allElements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2);
allElements.forEach((el, i) => {
  const zIndex = window.getComputedStyle(el).zIndex;
  console.log(`${i}: ${el.tagName} - z-index: ${zIndex}`);
});

// Look for an element with high z-index above the iframe
```

### Solution

**Remove absolute overlays over iframe:**
```tsx
// ❌ WRONG
<div className="relative">
  <iframe />
  <div className="absolute inset-0 z-50 bg-black/50" /> {/* Blocks iframe! */}
</div>

// ✅ CORRECT - Loading overlay behind clicks
<div className="relative pointer-events-auto">
  {isLoading && (
    <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center pointer-events-auto" />
  )}
  <iframe className="w-full h-full pointer-events-auto" />
</div>
```

**Let Dialog handle z-index:**
```tsx
// ✅ CORRECT
<Dialog>
  <DialogContent className="pointer-events-auto">
    {/* Don't set z-index, Dialog handles it */}
    <iframe className="pointer-events-auto" />
  </DialogContent>
</Dialog>
```

---

## Fix #3: Dialog Component Not Passing Pointer Events

### Symptom
Using shadcn Dialog, iframe is there but pointer events are disabled.

### Quick Test
```javascript
// In console:
const dialogContent = document.querySelector('[role="dialog"]');
const style = window.getComputedStyle(dialogContent);
console.log('Dialog pointer-events:', style.pointerEvents);
```

### Solution

**Add pointer-events-auto to Dialog:**
```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={onClose}>
  {/* CRITICAL: Add pointer-events-auto */}
  <DialogContent className="pointer-events-auto max-w-4xl h-[90vh] p-0">
    <div className="flex-1 relative overflow-hidden pointer-events-auto">
      <iframe className="w-full h-full pointer-events-auto" />
    </div>
  </DialogContent>
</Dialog>
```

**If still doesn't work, override Dialog CSS:**
```css
/* In global CSS or component styles */
[role="dialog"] {
  pointer-events: auto !important;
}

[role="dialog"] > div {
  pointer-events: auto !important;
}

iframe {
  pointer-events: auto !important;
}
```

---

## Fix #4: Iframe Height Is 0

### Symptom
Iframe exists in HTML but has no visible height, so clicks don't register anywhere.

### Quick Test
```javascript
// In console:
const iframe = document.querySelector('iframe');
const rect = iframe.getBoundingClientRect();

console.log('Iframe width:', rect.width);      // Should be like 400+
console.log('Iframe height:', rect.height);    // Should be like 600+
console.log('Iframe visible:', rect.width > 0 && rect.height > 0);

// If height is 0, DOM looks like:
// <iframe style="width: 100%; height: 0%; "></iframe>
```

### Solution

**Set explicit height on iframe and parent:**
```tsx
// ❌ WRONG
<div>
  <iframe src="..." />
</div>

// ✅ CORRECT
<div className="h-[90vh] overflow-hidden">
  <iframe 
    src="..." 
    className="w-full h-full border-none"
    style={{ display: 'block' }}
  />
</div>
```

**If using flexbox:**
```tsx
// ✅ CORRECT
<div className="flex flex-col h-screen">
  <header className="flex-shrink-0 h-16">Header</header>
  <div className="flex-1 overflow-hidden"> {/* flex-1 gives it height */}
    <iframe className="w-full h-full" />
  </div>
</div>
```

---

## Fix #5: Provider Blocks Iframe (X-Frame-Options)

### Symptom
Iframe shows blank or error, and DevTools console shows:
```
Refused to display 'https://provider.com' in a frame because 
an X-Frame-Options HTTP header was received.
```

### Quick Test (Network Tab)
1. Open DevTools (F12) → Network tab
2. Reload page
3. Find iframe request in list
4. Click on it
5. Go to "Response Headers" tab
6. Search for `X-Frame-Options` or `Content-Security-Policy`

**Example output:**
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

### Solutions (in order)

**Option 1: Request provider to whitelist your domain**
```
Contact provider support:
"Can you whitelist our domain https://yourdomain.com for iframe embedding?"

Example: Add to their X-Frame-Options:
X-Frame-Options: ALLOW-FROM https://yourdomain.com
or CSP:
Content-Security-Policy: frame-ancestors 'https://yourdomain.com'
```

**Option 2: Use iframe with allow-top-navigation (risky)**
```tsx
<iframe 
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
/>
```
⚠️ Warning: This allows provider to navigate away from your page

**Option 3: Create backend proxy (safest)**
```tsx
// Backend creates endpoint that fetches provider iframe
const response = await fetch(`${import.meta.env.VITE_API_URL}/proxy/iframe`, {
  method: 'POST',
  body: JSON.stringify({ provider_url: 'https://provider.com/offerwall' })
});
const iframeContent = await response.text();

// But this is complex and may violate provider's ToS
```

**Option 4: Fallback to new tab**
```tsx
<OfferWallIframe
  provider={provider}
  isOpen={isOpen}
  onFrameError={() => {
    // If iframe fails, open in new tab
    window.open(provider.url, '_blank', 'width=1200,height=800');
  }}
/>
```

---

## Fix #6: Iframe Content Has Its Own Click Handlers

### Symptom
Iframe loads fine, but clicks within elements inside iframe don't work.
This might not be a CSS issue - it's provider's JavaScript.

### Quick Test
```javascript
// In console (if you can access iframe content):
const iframe = document.querySelector('iframe');
try {
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  const buttons = iframeDoc.querySelectorAll('button, [onclick]');
  console.log('Clickable elements in iframe:', buttons.length);
  buttons[0]?.click(); // Try clicking first button
} catch (e) {
  console.error('Cannot access iframe (cross-origin):', e);
}
```

### Solution

**If cross-origin (can't access iframe content):**
- This is normal and expected for security
- Issue is likely on provider's side
- Contact provider about iframe click issues

**If same-origin (can access):**
```javascript
// Provider's JavaScript might need initialization
// Check browser console for provider errors

const iframe = document.querySelector('iframe');
const iframeDoc = iframe.contentDocument;
const event = new Event('load', { bubbles: true });
iframeDoc.dispatchEvent(event);
```

---

## Fix #7: Modal/Dialog Clips Iframe Content

### Symptom
Part of iframe is clipped/cut off, especially on mobile.

### Quick Test
```javascript
// In console:
const iframe = document.querySelector('iframe');
const rect = iframe.getBoundingClientRect();
const parentRect = iframe.parentElement.getBoundingClientRect();

console.log('Iframe visible width:', rect.width);
console.log('Iframe visible height:', rect.height);
console.log('Parent width:', parentRect.width);
console.log('Parent height:', parentRect.height);

// If parent is smaller than iframe content, clipping occurs
```

### Solution

**On mobile, use full height:**
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();

<Dialog>
  <DialogContent 
    className={`
      ${isMobile ? 'max-w-full h-screen p-0' : 'max-w-4xl h-[90vh]'}
      pointer-events-auto
    `}
  >
    <iframe className="w-full h-full" />
  </DialogContent>
</Dialog>
```

**On desktop, set reasonable max dimensions:**
```tsx
<Dialog>
  <DialogContent className="max-w-4xl h-[90vh] pointer-events-auto">
    {/* This is 1024px wide, 90% of viewport height */}
  </DialogContent>
</Dialog>
```

---

## Fix #8: React Event Delegation Blocking Clicks

### Symptom
Using React onClick handlers that might interfere with iframe.

### Solution

**Don't attach click handlers to iframe container:**
```tsx
// ❌ WRONG
<div onClick={handleClick}>
  <iframe /> {/* Clicks captured by parent */}
</div>

// ✅ CORRECT
<div>
  <iframe /> {/* No handler on container */}
</div>
```

**If you need handlers on wrapper, filter for iframe:**
```tsx
// ✅ CORRECT
<div onClick={(e) => {
  // Don't trigger if clicked inside iframe
  if (e.target.tagName === 'IFRAME') return;
  if (e.target.closest('iframe')) return;
  
  handleParentClick();
}}>
  <iframe />
</div>
```

---

## Fix #9: Mismatched Sandbox Attribute

### Symptom
- Forms in iframe can't submit
- Popups don't open
- Provider script errors in console

### Solution

**Test sandbox permissions progressively:**

Start minimal:
```tsx
<iframe sandbox="allow-scripts" />
// If popups fail, add:
<iframe sandbox="allow-scripts allow-popups" />
// If forms fail, add:
<iframe sandbox="allow-scripts allow-popups allow-forms" />
// If tracking fails, add:
<iframe sandbox="allow-scripts allow-popups allow-forms allow-same-origin" />
```

**Check console for errors:**
```javascript
// In browser console, look for messages like:
// "Sandbox attribute blocked X"
// This tells you what permission to add
```

**Recommended for offerwalls:**
```tsx
<iframe 
  sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
/>
```

---

## Fix #10: CSS Specificity Issue (Tailwind)

### Symptom
Reading this guide, applied all fixes, but still doesn't work.

### Solution

**Use !important as last resort:**
```tsx
<iframe 
  className="w-full h-full border-none pointer-events-auto !important"
  style={{ 
    pointerEvents: 'auto !important',
    display: 'block !important'
  }}
/>
```

**Or create custom CSS:**
```css
/* In your component.css file */
.offerwall-iframe {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  display: block !important;
  pointer-events: auto !important;
}
```

```tsx
<iframe className="offerwall-iframe" />
```

---

## Debugging Checklist

Go through this systematically:

- [ ] Iframe is visible (not height:0)
- [ ] Parent has `pointer-events: auto`
- [ ] Iframe has `pointer-events: auto`
- [ ] No overlay with higher z-index above iframe
- [ ] Dialog has `pointer-events-auto` class
- [ ] Iframe has `display: block`
- [ ] Iframe has `width: 100%` and `height: 100%`
- [ ] No `pointer-events-none` anywhere in parent hierarchy
- [ ] Provider doesn't block iframe with X-Frame-Options
- [ ] Tested with different sandbox attributes
- [ ] Tested on mobile AND desktop
- [ ] Tested with slow network (DevTools Throttling)
- [ ] Checked browser console for errors
- [ ] Checked Network tab for failed requests

---

## Debug CSS Template

Copy this component for quick testing:

```tsx
import React from 'react';

const IframeDebug = ({ url }) => {
  const [info, setInfo] = React.useState({});

  React.useEffect(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return;

    const rect = iframe.getBoundingClientRect();
    const style = window.getComputedStyle(iframe);
    const parentStyle = window.getComputedStyle(iframe.parentElement);

    setInfo({
      iframeWidth: rect.width,
      iframeHeight: rect.height,
      iframePointerEvents: style.pointerEvents,
      iframeDisplay: style.display,
      iframeZIndex: style.zIndex,
      parentPointerEvents: parentStyle.pointerEvents,
      parentOverflow: parentStyle.overflow,
      parentPosition: parentStyle.position,
    });
  }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="max-w-4xl h-[90vh] border border-red-500 relative">
        <div className="absolute top-0 left-0 right-0 bg-red-100 p-2 z-50 text-xs">
          <p>✓ iframe with debug borders (red = iframe, blue = parent)</p>
        </div>
        <div className="absolute inset-0 border-4 border-blue-500 pointer-events-none mt-8"></div>
        <iframe
          src={url}
          className="w-full h-full border-4 border-red-500 mt-8 pointer-events-auto"
          style={{ display: 'block', pointerEvents: 'auto' }}
        />
      </div>

      <div className="bg-gray-100 p-4 rounded text-sm space-y-1">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Iframe dimensions: {info.iframeWidth} × {info.iframeHeight}</p>
        <p>Iframe pointer-events: {info.iframePointerEvents}</p>
        <p>Iframe display: {info.iframeDisplay}</p>
        <p>Parent pointer-events: {info.parentPointerEvents}</p>
        <p>Parent overflow: {info.parentOverflow}</p>
      </div>
    </div>
  );
};

export default IframeDebug;
```

---

## Contact Provider Support

If none of these work, provide provider support with this info:

```
Product: [Your Website]
Issue: Iframe clicks not working
Provider: [Provider Name]
URL: [Your Domain]

Details:
- Iframe loads and displays content
- But clicks inside iframe are unresponsive
- ConsoleErrors: [paste any errors]
- X-Frame-Options: [from Network tab]
- Tested in Chrome/Firefox/Safari

Can you help troubleshoot iframe integration?
```

---

## Related Resources

- [MDN: iframe element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN: pointer-events CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events)
- [MDN: sandbox attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/sandbox)
- [MDN: X-Frame-Options header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options)
- [shadcn Dialog docs](https://ui.shadcn.com/docs/components/dialog)
