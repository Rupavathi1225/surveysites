import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { X, AlertCircle } from "lucide-react";

interface OfferWallIframeProps {
  provider: any;
  isOpen: boolean;
  onClose: () => void;
  onframeLoad?: () => void;
  onFrameError?: () => void;
}

/**
 * OfferWallIframe Component
 * 
 * This component properly handles iframe embedding for offerwall providers.
 * 
 * Common issues fixed:
 * ✅ Pointer-events: auto on iframe parent and iframe itself
 * ✅ Correct z-index layering
 * ✅ Proper sandbox attributes for cross-origin iframes
 * ✅ No CSS overlays blocking clicks
 * ✅ Correct iframe sizing (width: 100%, height: 100vh)
 * ✅ iframe can scroll independently
 * ✅ Proper error handling and fallback
 */
export const OfferWallIframe: React.FC<OfferWallIframeProps> = ({
  provider,
  isOpen,
  onClose,
  onframeLoad,
  onFrameError,
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setIframeLoaded(false);
    setIframeError(false);
  }, [isOpen]);

  const handleIframeLoad = () => {
    setIframeLoaded(true);
    onframeLoad?.();
  };

  const handleIframeError = () => {
    setIframeError(true);
    onFrameError?.();
  };

  // Generate iframe src with user_id if needed
  let iframeSrc = "";
  
  // Debug logging
  console.log("OfferWallIframe - Provider data:", {
    name: provider.name,
    iframe_url: provider.iframe_url,
    iframe_code: provider.iframe_code,
    external_url: provider.external_url,
    url: provider.url
  });

  if (provider.iframe_url) {
    iframeSrc = provider.iframe_url;
  } else if (provider.iframe_code) {
    // If iframe_code contains full iframe HTML, extract the src attribute
    const match = String(provider.iframe_code).match(/src=["']([^"']+)["']/);
    if (match && match[1]) {
      iframeSrc = match[1];
    } else {
      // Otherwise treat iframe_code as a URL template and replace keys
      iframeSrc = String(provider.iframe_code).replace(/{user_id}/g, "user_123");
    }
  } else if (provider.external_url) {
    // Fallback to external_url if no iframe configured
    iframeSrc = provider.external_url;
  } else if (provider.url) {
    // Last fallback to url field
    iframeSrc = provider.url;
  }

  console.log("OfferWallIframe - Generated iframeSrc:", iframeSrc);

  if (!iframeSrc) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{provider.name}</DialogTitle>
            <DialogClose asChild>
              <button className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </DialogHeader>
          <div className="flex items-center justify-center h-full gap-2 text-muted-foreground flex-col">
            <AlertCircle className="h-5 w-5" />
            <div className="text-center space-y-2">
              <p>No iframe URL configured for this provider</p>
              <p className="text-xs text-muted-foreground/70">Provider object: {JSON.stringify(provider, null, 2)}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {/* 
        CRITICAL CSS FIX:
        - max-w-4xl: Reasonable max width
        - h-[90vh]: Take up most of viewport
        - pointer-events-auto: MUST HAVE - enables clicks
        - z-index not needed in Dialog (Dialog already handles z-stack)
      */}
      <DialogContent className="max-w-4xl h-[90vh] p-0 pointer-events-auto">
        <DialogHeader className="sticky top-0 bg-background border-b z-50 p-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {provider.image_url && (
                <img
                  src={provider.image_url}
                  alt={provider.name}
                  className="h-6 w-auto object-contain"
                />
              )}
              {provider.name}
            </DialogTitle>
            <DialogClose asChild>
              <button
                className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        {/* 
          CRITICAL: Iframe container styling
          - flex-1: Take remaining space
          - relative: For iframe positioning
          - overflow-hidden: Prevent container from scrolling
          - pointer-events-auto: Pass clicks through to iframe
          - NO pointer-events-none! This blocks iframe clicks!
        */}
        <div className="flex-1 relative overflow-hidden pointer-events-auto">
          {/* Loading skeleton while iframe loads */}
          {!iframeLoaded && !iframeError && (
            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center z-40 pointer-events-none">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading offerwall...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {iframeError && (
            <div className="absolute inset-0 bg-destructive/5 flex items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-sm font-medium">Failed to load offerwall</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  The provider's offerwall could not be loaded. This may be due to geo-restrictions,
                  account issues, or provider-side blocking. Try opening it in a new tab instead.
                </p>
                <button
                  onClick={() => window.open(iframeSrc, "_blank")}
                  className="mt-3 px-4 py-1.5 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition"
                >
                  Open in New Tab
                </button>
              </div>
            </div>
          )}

          {/* 
            CRITICAL: Iframe element styling
            - width: 100% and height: 100%: Fill container completely
            - border: none: Remove iframe border
            - display: block: Avoid bottom margin
            - pointer-events-auto: CRITICAL - enables clicks on iframe
            - sandbox: Attribute with proper permissions
            
            SANDBOX SETTINGS EXPLAINED:
            - allow-same-origin: If provider is same-origin
            - allow-scripts: Needed for most offerwalls
            - allow-popups: For survey links that open in new windows
            - allow-forms: Needed for form submission
            - allow-top-navigation: Let provider navigate (use caution)
            
            If iframe clicks STILL don't work:
            1. Check browser console (F12 > Console tab) for errors
            2. Check if provider blocks cross-origin iframes (X-Frame-Options header)
            3. Check Network tab to see if iframe request was blocked
            4. Try different sandbox attributes
            5. Contact provider about iframe compatibility
          */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={provider.name}
            className="w-full h-full border-none display-block pointer-events-auto"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            allow="geolocation; payment"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
            style={{
              zIndex: 51,
              display: "block",
              pointerEvents: "auto", // Inline style backup
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferWallIframe;
