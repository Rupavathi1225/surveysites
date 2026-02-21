# Offerwall iFrame Implementation Checklist

## 📋 Quick Implementation (5 steps)

### Step 1: Create the OfferWallIframe Component ✓
Copy the provided `OfferWallIframe.tsx` to your `src/components/` folder.

**File:** `src/components/OfferWallIframe.tsx`

Key features:
- ✅ `pointer-events-auto` on dialog content
- ✅ `pointer-events-auto` on iframe
- ✅ Proper sizing (width: 100%, height: 100%)
- ✅ Loading overlay while iframe loads
- ✅ Error handling with fallback to new tab
- ✅ Proper sandbox attributes
- ✅ User ID substitution ready

### Step 2: Update Your DailySurveys Component ✓
Use the updated `DailySurveys_UPDATED.tsx` as reference.

Key changes:
- ✅ Import `OfferWallIframe` component
- ✅ Add `selectedProvider` state for iframe modal
- ✅ Create `handleOpenProvider()` function
- ✅ Render offerwall cards with click handler
- ✅ Add `<OfferWallIframe />` component at bottom

### Step 3: Update Database Schema
Ensure your survey_providers table has these columns:

```sql
-- Already in your schema (verify)
ALTER TABLE survey_providers ADD COLUMN iframe_url TEXT;
ALTER TABLE survey_providers ADD COLUMN external_url TEXT;

-- Or use existing iframe_code:
-- iframe_code (already exists)
-- iframe_keys (already exists)
```

### Step 4: Configure Provider Iframes
In your admin panel (SurveyProviders.tsx), ensure you're storing:

```tsx
// Required fields for iframe providers:
{
  id: "mustache",
  name: "Mustache",
  iframe_url: "https://mustache.example.com/offerwall?user_id={user_id}",
  // OR
  iframe_code: "<iframe src='...'></iframe>",
  image_url: "...",
  // ... other fields
}
```

### Step 5: Test on Different Scenarios

Run through this checklist:

- [ ] Offerwall card clicks open modal
- [ ] Modal displays with provider name and image
- [ ] Iframe loads (see loading spinner)
- [ ] Clicks inside iframe work
- [ ] Popups open if provider uses them
- [ ] Form submissions work
- [ ] Close button (X) works
- [ ] Closing modal and reopening works
- [ ] Provider iframe loads again
- [ ] Test on mobile (full screen)
- [ ] Test on desktop (4xl dialog box)
- [ ] Test with slow network (DevTools throttling)
- [ ] Error handling if iframe fails
- [ ] Fallback to new tab works

---

## ✅ CSS Critical Properties

Make sure these are applied:

### Dialog Content
```tsx
<DialogContent className="pointer-events-auto">
  {/* pointer-events-auto is CRITICAL */}
</DialogContent>
```

### Iframe Container
```tsx
<div className="flex-1 overflow-hidden pointer-events-auto">
  {/* pointer-events-auto is CRITICAL */}
</div>
```

### Iframe Element
```tsx
<iframe 
  className="w-full h-full border-none pointer-events-auto"
  style={{ display: 'block', pointerEvents: 'auto' }}
/>
```

---

## 🔧 Configuration

### Environment Variables (if needed)
```env
# .env.local
VITE_IFRAME_ALLOW_ATTRIBUTES="geolocation; payment"
```

### Offerwall Provider Settings
In database, configure per provider:

```sql
-- Example: Mustache provider
UPDATE survey_providers 
SET 
  iframe_url = 'https://mustache.example.com/offerwall?user_id={user_id}&country=US',
  iframe_keys = '{user_id}',
  point_percentage = 100
WHERE name = 'Mustache';
```

### User ID Substitution
The component automatically replaces `{user_id}`:

```tsx
// In OfferWallIframe.tsx
const iframeSrc = provider.iframe_url
  ?.replace(/{user_id}/g, profile?.id || "guest")
  ?.replace(/{username}/g, profile?.username || "user")
  ?.replace(/{email}/g, profile?.email || "");
```

---

## 📱 Mobile Optimization

### Default Dialog Height
```tsx
<DialogContent className="max-w-4xl h-[90vh]">
  {/* Desktop: 4xl width, 90% height */}
  {/* Mobile: still works but may feel cramped */}
</DialogContent>
```

### Better Mobile
```tsx
import { useIsMobile } from '@/hooks/use-mobile';

const isMobile = useIsMobile();

<DialogContent className={`
  ${isMobile ? 'max-w-full h-screen' : 'max-w-4xl h-[90vh]'}
  pointer-events-auto
`}>
```

---

## 🔐 Security Considerations

### Sandbox Attribute
Current setting:
```tsx
sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
```

This allows:
- ✅ JavaScript execution
- ✅ Form submissions
- ✅ Popups (new tabs)
- ✅ Session cookies
- ✅ Popups can escape sandbox

Does NOT allow:
- ❌ Navigation of parent page
- ❌ Access to parent DOM
- ❌ Ambient light/permissions

### Whitelist Providers
Only add providers you trust to your database. Check:
- [ ] Provider is legitimate
- [ ] Provider's privacy policy is acceptable
- [ ] Provider doesn't spam redirects
- [ ] Provider respects user privacy

---

## 📊 Tracking & Analytics

### Click Tracking
Already implemented in DailySurveys:
```tsx
const trackClick = async (item: any, type: string) => {
  // Tracks to offer_clicks table
  // Records user, session, IP, device, browser, etc.
};
```

### Completion Tracking
For offerwall completions, providers send postbacks:

```
GET /api/postback?user_id={user_id}&offer_id={offer_id}&amount={amount}&status=completed
```

Configure in Supabase:
```sql
-- Webhook: supabase/functions/receive-postback
-- Receives provider postbacks
-- Updates user points in profiles table
```

---

## 🐛 Common Issues & Fixes

### Issue: Iframe Visible But Clicks Don't Work
**Fix:** Add `pointer-events-auto` to dialog and iframe

### Issue: Iframe Content Gets Cut Off
**Fix:** Use `h-[90vh]` on dialog, ensure parent has flex-1

### Issue: Modal Opens But Iframe Blank
**Fix:** Check iframe_url is set, valid URL, provider doesn't block

### Issue: Provider Blocks Iframe
**Error:** "X-Frame-Options: DENY" in Network tab
**Fix:** Contact provider to whitelist your domain

### Issue: Form Submission Fails in Iframe
**Fix:** Add `allow-forms` to sandbox attribute

### Issue: Popups Don't Open in Iframe
**Fix:** Add `allow-popups` to sandbox attribute

---

## 📈 Performance Optimization

### Lazy Load Iframe
```tsx
const [iframeUrl, setIframeUrl] = useState<string | null>(null);

const handleOpenDialog = () => {
  // Only set URL when opening
  setIframeUrl(provider.iframe_url);
  setIsOpen(true);
};

// Only render if URL set
{iframeUrl && <iframe src={iframeUrl} />}
```

### Cache Provider List
```tsx
// Already done:
const [providers, setProviders] = useState([]); // Fetch once on mount
```

### Defer Loading State
```tsx
const [isLoading, setIsLoading] = useState(false);
const [isVisible, setIsVisible] = useState(false);

useEffect(() => {
  if (isOpen) {
    setIsLoading(true);
    setIsVisible(true);
  }
}, [isOpen]);
```

---

## 🚀 Deployment Checklist

Before going live:

- [ ] Test with all major providers (Mustache, PollFish, etc.)
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test on iPhone, Android phones
- [ ] Test on iPad, Android tablets
- [ ] Test with slow 3G network (DevTools throttle)
- [ ] Test with VPN/proxy enabled
- [ ] Verify user ID substitution works
- [ ] Verify click tracking logs correctly
- [ ] Verify completion postbacks work
- [ ] Test close modal and reopen
- [ ] Test error handling (offline provider)
- [ ] Check console for no errors
- [ ] Check for resource leaks (DevTools > Memory)
- [ ] Test with real users (beta group) first

---

## 📚 Files Created

| File | Purpose |
|------|---------|
| `src/components/OfferWallIframe.tsx` | Main iframe component with all fixes |
| `src/pages/dashboard/DailySurveys_UPDATED.tsx` | Example integration (use as reference) |
| `src/styles/offerwall-iframe.css` | Complete CSS patterns |
| `OFFERWALL_IFRAME_GUIDE.md` | Comprehensive technical guide |
| `IFRAME_TROUBLESHOOTING.md` | Detailed debugging guide |

---

## 🎯 Implementation Priority

### Phase 1: Basic (Day 1)
- ✅ Copy OfferWallIframe.tsx component
- ✅ Update DailySurveys.tsx to use component
- ✅ Test with one provider
- ✅ Fix any CSS issues

### Phase 2: Enhancement (Day 2)
- ✅ Add error handling
- ✅ Test with multiple providers
- ✅ Mobile optimization
- ✅ Analytics/tracking

### Phase 3: Polish (Day 3)
- ✅ Performance optimization
- ✅ Edge case handling
- ✅ User feedback improvements
- ✅ Testing on all devices

---

## 📞 Support Resources

If you get stuck:

1. **Check OFFERWALL_IFRAME_GUIDE.md**
   - Covers all technical aspects
   - Includes sandbox attribute options
   - Provider-specific solutions

2. **Run IFRAME_TROUBLESHOOTING.md**
   - Systematic debugging approach
   - Console commands to diagnose
   - Network tab inspection steps

3. **Look for browser console errors** (F12 > Console)
   - Oftentimes provider itself provides hints
   - Search for "Sandbox" or "X-Frame-Options"

4. **Check provider documentation**
   - Most providers have iframe integration guides
   - Contact their support for domain whitelisting

---

## ✨ Key Takeaways

### The 3 Critical CSS Properties
```css
pointer-events: auto;      /* Let clicks pass through */
display: block;            /* Remove inline spacing */
width: 100%;              /* Fill container */
height: 100%;             /* Take full height */
```

### The 2 Critical Sandbox Attributes
```html
<!-- For most offerwalls -->
sandbox="allow-scripts allow-popups allow-forms allow-same-origin"

<!-- For complex offerwalls -->
sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-popups-to-escape-sandbox"
```

### The 1 Critical Debug Step
```javascript
// In browser console (F12)
window.getComputedStyle(document.querySelector('iframe')).pointerEvents
// Should output: 'auto'
```

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ Offerwall card clickable
- ✅ Modal opens smoothly
- ✅ Iframe loads with provider content
- ✅ Clicks inside iframe work
- ✅ Forms can be submitted
- ✅ Popups open when clicked
- ✅ Modal closes properly
- ✅ No errors in console
- ✅ Works on mobile and desktop
- ✅ Tracking records clicks correctly

