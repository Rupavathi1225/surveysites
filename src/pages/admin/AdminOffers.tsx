import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Pencil, Trash2, Upload, Loader2, FileUp, Eye, BarChart3,
  Download, Zap, Filter, CheckCircle, Copy, Clipboard, Info, Calendar, Clock,
  ChevronLeft, ChevronRight, X, Link2, RefreshCw, AlertTriangle, Check, XCircle, SkipForward, Pause, Play
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseCSV,
  autoFillOfferData,
  validateOfferData,
  offersToCsv,
  downloadCsv,
  generateOfferImage,
  generateTrafficSource,
  detectVertical,
  detectCategory,
  downloadTemplate,
  parseGoogleSheet,
  simplifyName,
} from "@/lib/bulkImportUtils";
import { checkBatchDuplicates, logDuplicateDetection, findDuplicateOffers } from "@/lib/duplicateDetection";
import { detectMissingOffers, saveMissingOffersReport, getMissingOffersReports, deleteMissingOffersReport } from "@/lib/missingOffersDetection";
import { moveToRecycleBin, restoreFromRecycleBin, permanentlyDeleteFromRecycleBin, getRecycleBinItems, getRecycleBinCount, moveMultipleToRecycleBin, restoreMultipleFromRecycleBin, permanentlyDeleteMultipleFromRecycleBin } from '../../lib/recycleBin';

interface OfferData {
  id?: string;
  offer_id?: string;
  title?: string;
  url?: string;
  preview_url?: string;
  tracking_url?: string;
  payout?: number;
  currency?: string;
  payout_model?: string;
  description?: string;
  countries?: string;
  allowed_countries?: string;
  platform?: string;
  device?: string;
  devices?: string;
  vertical?: string;
  category?: string;
  image_url?: string;
  traffic_sources?: string;
  expiry_date?: string;
  percent?: number;
  approval_status?: string;
  approved_date?: string;
  approved_by?: string;
  rejection_reason?: string;
  non_access_url?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  network_id?: string;
  is_public?: boolean;
}

const defaultForm: OfferData = {
  offer_id: "", 
  title: "", 
  url: "", 
  preview_url: "", 
  tracking_url: "", 
  payout: 0, 
  currency: "USD", 
  payout_model: "CPA",
  description: "",
  countries: "", 
  allowed_countries: "", 
  platform: "", 
  device: "", 
  devices: "",
  vertical: "",
  category: "",
  image_url: "", 
  traffic_sources: "", 
  expiry_date: "", 
  percent: 0, 
  non_access_url: "", 
  status: "pending",
  approval_status: "pending", 
  approved_date: "", 
  approved_by: "", 
  rejection_reason: "", 
  created_at: "", 
  updated_at: "",
  network_id: "",
  is_public: true
};

const AdminOffers = () => {
  const [items, setItems] = useState<any[]>([]);
  const [allOffersData, setAllOffersData] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // CRITICAL FIX: Force re-render key
  const [form, setForm] = useState<any>(defaultForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [recycleBinItems, setRecycleBinItems] = useState<any[]>([]);
  const [missingOffersReports, setMissingOffersReports] = useState<any[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<Map<number, any>>(new Map());
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [bulkImportPreview, setBulkImportPreview] = useState<any[]>([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [selectedRecycleBin, setSelectedRecycleBin] = useState<Set<string>>(new Set());
  const [processingBulkImport, setProcessingBulkImport] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState("");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [viewingOffer, setViewingOffer] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [bulkViewDialogOpen, setBulkViewDialogOpen] = useState(false);
  const [bulkViewOffers, setBulkViewOffers] = useState<any[]>([]);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyCount, setCopyCount] = useState(1);
  const [copying, setCopying] = useState(false);
  const [generatingTrackingUrl, setGeneratingTrackingUrl] = useState(false);
  const [generatingForOffer, setGeneratingForOffer] = useState<string | null>(null);
  const [bulkSelectCount, setBulkSelectCount] = useState(50);
  
  // Tab-specific selection states
  const [selectedActiveOffers, setSelectedActiveOffers] = useState<Set<string>>(new Set());
  const [selectedInactiveOffers, setSelectedInactiveOffers] = useState<Set<string>>(new Set());
  
  // Tab-specific bulk selection dropdowns
  const [activeBulkSelect, setActiveBulkSelect] = useState("");
  const [inactiveBulkSelect, setInactiveBulkSelect] = useState("");
  const [boostedBulkSelect, setBoostedBulkSelect] = useState("");
  
  // Bulk upload status selector
  const [bulkUploadStatus, setBulkUploadStatus] = useState("pending");

  // Filter states for offers
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [networks, setNetworks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOffers, setTotalOffers] = useState(0);
  const [activeTab, setActiveTab] = useState("active");

  // Boost dialog state
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [boostPercent, setBoostPercent] = useState(10);
  const [boostDate, setBoostDate] = useState("");
  const [boosting, setBoosting] = useState(false);

// Boosted offers state
  const [boostedOffers, setBoostedOffers] = useState<any[]>([]);
  const [selectedBoostedOffers, setSelectedBoostedOffers] = useState<Set<string>>(new Set());
  const [extraBoostDialog, setExtraBoostDialog] = useState(false);
  const [extraBoostPercent, setExtraBoostPercent] = useState(20);
  const [extraBoostDate, setExtraBoostDate] = useState("");
  const [extraBoosting, setExtraBoosting] = useState(false);

  // Duplicate offers dialog state
  const [duplicateOffersDialogOpen, setDuplicateOffersDialogOpen] = useState(false);
  const [duplicateOffers, setDuplicateOffers] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    valid: number;
    duplicates: number;
    invalid: number;
  } | null>(null);

  // Duplicate groups state for Duplicates tab
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);

// Recycle bin multi-delete state
  const [deletingRecycleBin, setDeletingRecycleBin] = useState(false);
  const [deletingCount, setDeletingCount] = useState(0);
  const [deletingTotal, setDeletingTotal] = useState(0);
  const [restoringRecycleBin, setRestoringRecycleBin] = useState(false);

  // Individual delete progress state
  const [deletingOffer, setDeletingOffer] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState(0);

  // Handle multiple permanent delete from recycle bin with progress
  const handleMultiplePermanentDelete = async () => {
    if (selectedRecycleBin.size === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }

    setDeletingRecycleBin(true);
    setDeletingCount(0);
    setDeletingTotal(selectedRecycleBin.size);

    try {
      const idsToDelete = Array.from(selectedRecycleBin);
      
      // Use the batch delete function with progress callback
      const result = await permanentlyDeleteMultipleFromRecycleBin(
        idsToDelete,
        (current, total) => {
          setDeletingCount(current);
        }
      );

      toast({ 
        title: "Deletion Complete", 
        description: `Successfully deleted ${result.successful} item${result.successful !== 1 ? 's' : ''}` 
      });
      
      setSelectedRecycleBin(new Set());
      loadRecycleBin();
    } catch (error) {
      toast({ title: "Delete failed", description: String(error), variant: "destructive" });
    } finally {
      setDeletingRecycleBin(false);
      setDeletingCount(0);
      setDeletingTotal(0);
    }
  };

  // Handle multiple restore from recycle bin
  const handleMultipleRestore = async () => {
    if (selectedRecycleBin.size === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }

    setRestoringRecycleBin(true);

    try {
const idsToRestore = Array.from(selectedRecycleBin);

      const result = await restoreMultipleFromRecycleBin(idsToRestore);

      toast({ 
        title: "Restore Complete", 
        description: `Successfully restored ${result.successful} item${result.successful !== 1 ? 's' : ''}` 
      });
      
      setSelectedRecycleBin(new Set());
      loadRecycleBin();
      load();
    } catch (error) {
      toast({ title: "Restore failed", description: String(error), variant: "destructive" });
    } finally {
      setRestoringRecycleBin(false);
    }
  };

  // Function to generate tracking URL via API
  const generateTrackingUrl = async (offer: any) => {
    try {
      setGeneratingTrackingUrl(true);
      setGeneratingForOffer(offer.id);

      // Validate that we have a unique offer_id
      if (!offer.offer_id) {
        toast({ 
          title: "Cannot Generate Tracking URL", 
          description: "This offer doesn't have a unique Offer ID. Please edit the offer and add an Offer ID first.",
          variant: "destructive" 
        });
        return null;
      }

      // Call your tracking URL generation API with the unique offer_id
      const response = await fetch('/api/generate-tracking-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offer_id: offer.offer_id, // This should be unique per offer
          title: offer.title,
          url: offer.url,
          network_id: offer.network_id,
          country: offer.countries,
          platform: offer.platform,
          device: offer.device,
          payout: offer.payout,
          currency: offer.currency
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate tracking URL');
      }

      const data = await response.json();
      const trackingUrl = data.tracking_url;

      // Update the offer in database with the new tracking URL
      const { error } = await supabase
        .from('offers')
        .update({ 
          tracking_url: trackingUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', offer.id);

      if (error) {
        throw error;
      }

      toast({ 
        title: "Tracking URL Generated", 
        description: `Tracking URL generated for Offer ID: ${offer.offer_id}` 
      });

      // Refresh the offers list
      load();
      
      return trackingUrl;
    } catch (error) {
      console.error("Error generating tracking URL:", error);
      toast({ 
        title: "Generation Failed", 
        description: String(error), 
        variant: "destructive" 
      });
      return null;
    } finally {
      setGeneratingTrackingUrl(false);
      setGeneratingForOffer(null);
    }
  };

  // Function to generate tracking URLs for multiple offers
  const generateBulkTrackingUrls = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }

    // Check if all selected offers have offer_ids
    const selected = items.filter(o => selectedOffers.has(o.id));
    const offersWithoutId = selected.filter(o => !o.offer_id);
    
    if (offersWithoutId.length > 0) {
      toast({ 
        title: "Cannot Generate Tracking URLs", 
        description: `${offersWithoutId.length} selected offers don't have unique Offer IDs. Please add Offer IDs first.`,
        variant: "destructive" 
      });
      return;
    }

    setGeneratingTrackingUrl(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const offer of selected) {
        try {
          const response = await fetch('/api/generate-tracking-url', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              offer_id: offer.offer_id, // Each offer has its own unique ID
              title: offer.title,
              url: offer.url,
              network_id: offer.network_id,
              country: offer.countries,
              platform: offer.platform,
              device: offer.device,
              payout: offer.payout,
              currency: offer.currency
            }),
          });

          if (!response.ok) {
            failCount++;
            continue;
          }

          const data = await response.json();
          const trackingUrl = data.tracking_url;

          const { error } = await supabase
            .from('offers')
            .update({ 
              tracking_url: trackingUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', offer.id);

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error("Error generating for offer:", offer.id, error);
          failCount++;
        }
      }

      toast({ 
        title: "Bulk Tracking URL Generation Complete", 
        description: `Successfully generated: ${successCount}, Failed: ${failCount}` 
      });

      // Refresh the offers list
      load();
      setSelectedOffers(new Set());
    } catch (error) {
      console.error("Error in bulk generation:", error);
      toast({ 
        title: "Bulk Generation Failed", 
        description: String(error), 
        variant: "destructive" 
      });
    } finally {
      setGeneratingTrackingUrl(false);
    }
  };

  // Fetch networks from database
  const fetchNetworks = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("network_id")
        .neq("network_id", null)
        .eq("is_deleted", false);
      
      if (error) {
        console.error("Error fetching networks:", error);
        return;
      }
      
      const uniqueNetworks = [...new Set(data?.map(o => o.network_id).filter(Boolean))];
      setNetworks(uniqueNetworks);
    } catch (error) {
      console.error("Error fetching networks:", error);
    }
  };

  // Get unique filter values from offers (use allOffersData as master source)
  const categories = [...new Set(allOffersData.map(o => o.category).filter(Boolean))];
  const devices = [...new Set(allOffersData.map(o => o.device || o.devices).filter(Boolean))];
  const countries = [...new Set(allOffersData.flatMap(o => (o.countries || "").split(",").map((c: string) => c.trim())).filter(Boolean))];

  // CRITICAL FIX: Filter Active/Inactive/Boosted from allOffersData (master source)
  const activeOffers = allOffersData.filter(o => o.status === "active");
  const inactiveOffers = allOffersData.filter(o => o.status === "inactive");
  const boostedOffersList = allOffersData.filter(o => o.status === "boosted");

  // Filter offers based on selected filters
  const filterOffers = (offers: any[]) => {
    return offers.filter(o => {
      // Status filter - apply to main offers list
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
      if (deviceFilter !== "all" && o.device !== deviceFilter && o.devices !== deviceFilter) return false;
      if (countryFilter !== "all" && o.countries && !o.countries.toLowerCase().includes(countryFilter.toLowerCase())) return false;
      if (networkFilter !== "all" && o.network_id !== networkFilter) return false;
      return true;
    });
  };

const filteredActiveOffers = filterOffers(activeOffers);
  const filteredInactiveOffers = filterOffers(inactiveOffers);
  
  // Filter boosted offers based on selected filters
  const filteredBoostedOffersList = filterOffers(boostedOffersList);

  // Pagination logic
  const itemsPerPage = 30;
  const getPaginatedOffers = (offers: any[]) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return offers.slice(start, end);
  };

  const paginatedActiveOffers = getPaginatedOffers(filteredActiveOffers);
  const paginatedInactiveOffers = getPaginatedOffers(filteredInactiveOffers);
  const paginatedBoostedOffers = getPaginatedOffers(filteredBoostedOffersList);

  const totalPages = activeTab === "active" 
    ? Math.ceil(filteredActiveOffers.length / itemsPerPage)
    : activeTab === "inactive" 
    ? Math.ceil(filteredInactiveOffers.length / itemsPerPage)
    : Math.ceil(filteredBoostedOffersList.length / itemsPerPage);

// Load boosted offers - show all boosted offers including soft-deleted ones
  const loadBoostedOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("is_deleted", false)
        .or("status.eq.boosted,percent.gt.0,expiry_date.not.is.null")
        .order("expiry_date", { ascending: false });
      
      if (error) {
        console.error("Error loading boosted offers:", error);
        return;
      }
      
      setBoostedOffers(data || []);
    } catch (error) {
      console.error("Error loading boosted offers:", error);
    }
  };

  useEffect(() => {
    load();
    loadAllOffers();
    loadRecycleBin();
    loadMissingOffersReports();
    loadBoostedOffers();
    fetchNetworks();

    // Listen for recycle bin update events
    const handleRecycleBinUpdate = (event: any) => {
      console.log('🔄 Recycle bin update event received:', event.detail);
      loadAllOffers();
      loadRecycleBin();
      fetchNetworks();
    };

    // Listen for offers imported events
    const handleOffersImported = (event: any) => {
      console.log('🔄 Offers imported event received:', event.detail);
      console.log('🔄 EVENT DEBUG - Event type:', event.type);
      console.log('🔄 EVENT DEBUG - Event detail:', event.detail);
      console.log('🔄 EVENT DEBUG - About to call loadAllOffers()');
      
      // CRITICAL FIX: Call loadAllOffers() to update All Offers tab
      loadAllOffers();
      
      // CRITICAL FIX: Also call load() to keep items synchronized
      load(); // This will update both items and allOffersData
      
      // CRITICAL FIX: Add delay to ensure database consistency
      setTimeout(() => {
        console.log('🔄 DELAYED REFRESH - Now calling other functions after delay');
        loadBoostedOffers(); // For Boosted tab
        fetchNetworks();
        console.log('🔄 EVENT DEBUG - All load functions called with delay');
        
        // ULTIMATE FIX: Force page reload if count doesn't update after 2 seconds
        setTimeout(() => {
          console.log('🔥 ULTIMATE FIX - Checking if count updated...');
          console.log('🔥 ULTIMATE FIX - Current count:', allOffersData.length);
          console.log('🔥 ULTIMATE FIX - Expected count should be higher');
          
          // If count is still not updating, force page reload
          if (allOffersData.length < (event.detail.count || 0)) {
            console.log('🔥 ULTIMATE FIX - Forcing page reload to update counts');
            window.location.reload();
          }
        }, 2000);
      }, 500); // 500ms delay to ensure database consistency
    };

    window.addEventListener('recycleBinUpdated', handleRecycleBinUpdate);
    window.addEventListener('offers-imported', handleOffersImported);
    
    return () => {
      window.removeEventListener('recycleBinUpdated', handleRecycleBinUpdate);
      window.removeEventListener('offers-imported', handleOffersImported);
    };
  }, []);

  // Update total offers when items change
  useEffect(() => {
    setTotalOffers(items.length);
  }, [items]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Handle bulk selection dropdown changes
  useEffect(() => {
    if (activeBulkSelect) {
      handleActiveBulkSelect();
      setActiveBulkSelect("");
    }
  }, [activeBulkSelect]);

  useEffect(() => {
    if (inactiveBulkSelect) {
      handleInactiveBulkSelect();
      setInactiveBulkSelect("");
    }
  }, [inactiveBulkSelect]);

  useEffect(() => {
    if (boostedBulkSelect) {
      handleBoostedBulkSelect();
      setBoostedBulkSelect("");
    }
  }, [boostedBulkSelect]);

  // View single offer details
  const viewOfferDetails = (offer: any) => {
    setViewingOffer(offer);
    setViewDialogOpen(true);
  };

  // View multiple offers details
  const viewMultipleOffersDetails = () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    
    const selected = items.filter(o => selectedOffers.has(o.id));
    setBulkViewOffers(selected);
    setBulkViewDialogOpen(true);
  };

  // Copy single offer
// helper to strip existing _COPY suffixes so we don't keep appending repeatedly
const getBaseOfferId = (offerId?: string) => {
  if (!offerId) return "";
  // remove everything from first _COPY onward
  return offerId.replace(/_COPY.*$/g, "");
};

// helper to strip existing (Copy) suffixes from title so we don't keep appending repeatedly
const getBaseTitle = (title?: string) => {
  if (!title) return "";
  // remove all (Copy) occurrences and trim extra spaces
  return title.replace(/\s*\(Copy\)\s*/g, "").trim();
};

const copyOffer = async (offer: any) => {
    try {
      const { title, offer_id, ...rest } = offer;
      
      // Generate a new unique offer_id for the copy, cleaning previous COPY markers
      const baseOfferId = getBaseOfferId(offer_id);
      const newOfferId = baseOfferId ? `${baseOfferId}_COPY_${Date.now()}` : `OFFER_COPY_${Date.now()}`;
      
      // Clean the title of existing (Copy) text before adding new one
      const baseTitle = getBaseTitle(title);
      const newTitle = `${baseTitle} (Copy)`;
      
      const newOffer = {
        ...rest,
        title: newTitle,
        offer_id: newOfferId,
        tracking_url: null, // Reset tracking URL as it needs to be generated for the new offer_id
        id: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: "pending"
      };
      
      const { error } = await supabase.from("offers").insert(newOffer);
      
      if (error) {
        toast({ title: "Copy failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Offer copied successfully", description: `New Offer ID: ${newOfferId}` });
        load();
      }
    } catch (error) {
      toast({ title: "Copy failed", description: String(error), variant: "destructive" });
    }
  };

  // copy detail strings for clipboard
  const copyOfferDetailsToClipboard = (offer: any) => {
    const details = `Offer ID: ${offer.offer_id || "-"}
Network ID: ${offer.network_id || "-"}
Title: ${offer.title || "-"}
URL: ${offer.url || "-"}
Payout: ${offer.payout || 0} ${offer.currency || ""}
Countries: ${offer.countries || "-"}
Platform: ${offer.platform || "-"}
Device: ${offer.device || "-"}
Vertical: ${offer.vertical || "-"}
Category: ${offer.category || "-"}
Tracking URL: ${offer.tracking_url || "-"}
Status: ${offer.status || "-"}
Created At: ${offer.created_at || "-"}
Updated At: ${offer.updated_at || "-"}
Expiry Date: ${offer.expiry_date || "-"}`;
    navigator.clipboard.writeText(details);
    toast({ title: "Offer details copied" });
  };

  const copyMultipleOffersDetails = () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    const selected = items.filter(o => selectedOffers.has(o.id));
    const details = selected.map(o => {
      return `Offer ID: ${o.offer_id || "-"}
Network ID: ${o.network_id || "-"}
Title: ${o.title || "-"}
URL: ${o.url || "-"}
Payout: ${o.payout || 0} ${o.currency || ""}
Countries: ${o.countries || "-"}
Platform: ${o.platform || "-"}
Device: ${o.device || "-"}
Vertical: ${o.vertical || "-"}
Category: ${o.category || "-"}
Tracking URL: ${o.tracking_url || "-"}
Status: ${o.status || "-"}
Created At: ${o.created_at || "-"}
Updated At: ${o.updated_at || "-"}
Expiry Date: ${o.expiry_date || "-"}`;
    }).join("\n\n");
    navigator.clipboard.writeText(details);
    toast({ title: `Copied details of ${selected.length} offer${selected.length !== 1 ? 's' : ''}` });
  };

  // CSV Export functions
  const exportToCsv = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }
    
    try {
      const csv = offersToCsv(data);
      downloadCsv(csv, filename);
      toast({ title: "Export successful", description: `Exported ${data.length} offers to ${filename}` });
    } catch (error) {
      toast({ title: "Export failed", description: String(error), variant: "destructive" });
    }
  };

  const exportActiveOffers = () => {
    exportToCsv(filteredActiveOffers, `active_offers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportInactiveOffers = () => {
    exportToCsv(filteredInactiveOffers, `inactive_offers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportBoostedOffers = () => {
    exportToCsv(filteredBoostedOffersList, `boosted_offers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportDuplicateGroups = () => {
    const allDuplicates = duplicateGroups.flatMap(group => group.offers);
    exportToCsv(allDuplicates, `duplicate_offers_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Helper function to calculate remaining days in recycle bin
  const calculateRemainingDays = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = now.getTime() - deletedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays); // Show 0-30 days remaining
  };

  const exportRecycleBin = () => {
    const recycleBinData = recycleBinItems.map(item => ({
      ...item.offer_data,
      deleted_at: item.deleted_at,
      days_remaining: calculateRemainingDays(item.deleted_at)
    }));
    exportToCsv(recycleBinData, `recycle_bin_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleMakeActive = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    
    try {
      let successCount = 0;
      for (const offerId of selectedOffers) {
        const { error } = await supabase.from("offers").update({ 
          status: "active",
          updated_at: new Date().toISOString()
        }).eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ 
        title: "Status Updated!", 
        description: `${successCount} offers marked as active` 
      });
      setSelectedOffers(new Set());
      load();
      loadAllOffers();
    } catch (error) {
      toast({ title: "Status update failed", description: String(error), variant: "destructive" });
    }
  };

  const handleMakeInactive = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    
    try {
      let successCount = 0;
      for (const offerId of selectedOffers) {
        const { error } = await supabase.from("offers").update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        }).eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ 
        title: "Status Updated!", 
        description: `${successCount} offers marked as inactive` 
      });
      setSelectedOffers(new Set());
      load();
      loadAllOffers();
    } catch (error) {
      toast({ title: "Status update failed", description: String(error), variant: "destructive" });
    }
  };

  const handleMakeBoosted = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    
    // Set default boost values
    setBoostPercent(20);
    setBoostDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 7 days from now
    setShowBoostDialog(true);
  };

  // Clear filters function
  const clearFilters = () => {
    setCategoryFilter("all");
    setDeviceFilter("all");
    setCountryFilter("all");
    setNetworkFilter("all");
    setStatusFilter("all");
  };

  // Bulk select function
  const handleBulkSelect = () => {
    const offersToSelect = allOffersData.slice(0, bulkSelectCount);
    const newSelected = new Set(selectedOffers);
    offersToSelect.forEach(offer => newSelected.add(offer.id));
    setSelectedOffers(newSelected);
    toast({ 
      title: "Bulk Selection Complete", 
      description: `Selected ${offersToSelect.length} offers` 
    });
  };

  // Tab-specific bulk selection functions
  const handleActiveBulkSelect = () => {
    const count = parseInt(activeBulkSelect);
    if (!count) return;
    
    const offersToSelect = filteredActiveOffers.slice(0, count);
    const newSelected = new Set(selectedActiveOffers);
    offersToSelect.forEach(offer => newSelected.add(offer.id));
    setSelectedActiveOffers(newSelected);
    toast({ 
      title: "Bulk Selection Complete", 
      description: `Selected ${offersToSelect.length} active offers` 
    });
  };

  const handleInactiveBulkSelect = () => {
    const count = parseInt(inactiveBulkSelect);
    if (!count) return;
    
    const offersToSelect = filteredInactiveOffers.slice(0, count);
    const newSelected = new Set(selectedInactiveOffers);
    offersToSelect.forEach(offer => newSelected.add(offer.id));
    setSelectedInactiveOffers(newSelected);
    toast({ 
      title: "Bulk Selection Complete", 
      description: `Selected ${offersToSelect.length} inactive offers` 
    });
  };

  const handleBoostedBulkSelect = () => {
    const count = parseInt(boostedBulkSelect);
    if (!count) return;
    
    const offersToSelect = filteredBoostedOffersList.slice(0, count);
    const newSelected = new Set(selectedBoostedOffers);
    offersToSelect.forEach(offer => newSelected.add(offer.id));
    setSelectedBoostedOffers(newSelected);
    toast({ 
      title: "Bulk Selection Complete", 
      description: `Selected ${offersToSelect.length} boosted offers` 
    });
  };

  // Bulk status management functions
  const handleBulkMakeInactive = async () => {
    if (selectedActiveOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .in("id", Array.from(selectedActiveOffers));

      if (error) throw error;

      toast({ 
        title: "Bulk Update Complete", 
        description: `Made ${selectedActiveOffers.size} offers inactive` 
      });
      
      setSelectedActiveOffers(new Set());
      await Promise.all([load(), loadAllOffers(), loadBoostedOffers()]);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleBulkMakeActive = async () => {
    if (selectedInactiveOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({ 
          status: "active",
          updated_at: new Date().toISOString()
        })
        .in("id", Array.from(selectedInactiveOffers));

      if (error) throw error;

      toast({ 
        title: "Bulk Update Complete", 
        description: `Made ${selectedInactiveOffers.size} offers active` 
      });
      
      setSelectedInactiveOffers(new Set());
      await Promise.all([load(), loadAllOffers(), loadBoostedOffers()]);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleBulkBoost = async () => {
    if (selectedActiveOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({ 
          status: "boosted",
          updated_at: new Date().toISOString()
        })
        .in("id", Array.from(selectedActiveOffers));

      if (error) throw error;

      toast({ 
        title: "Bulk Boost Complete", 
        description: `Boosted ${selectedActiveOffers.size} offers` 
      });
      
      setSelectedActiveOffers(new Set());
      await Promise.all([load(), loadAllOffers(), loadBoostedOffers()]);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  const handleBulkUnboost = async () => {
    if (selectedBoostedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("offers")
        .update({ 
          status: "active",
          updated_at: new Date().toISOString()
        })
        .in("id", Array.from(selectedBoostedOffers));

      if (error) throw error;

      toast({ 
        title: "Bulk Unboost Complete", 
        description: `Unboosted ${selectedBoostedOffers.size} offers` 
      });
      
      setSelectedBoostedOffers(new Set());
      await Promise.all([load(), loadAllOffers(), loadBoostedOffers()]);
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  // Copy multiple offers (duplicate records)
  const copyMultipleOffers = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    
    setCopying(true);
    try {
      const selected = items.filter(o => selectedOffers.has(o.id));
      let successCount = 0;
      
      for (let i = 0; i < copyCount; i++) {
        for (const offer of selected) {
          const { title, offer_id, ...rest } = offer;
          
          // Clean the offer_id of existing COPY markers
          const baseOfferId = getBaseOfferId(offer_id);
          const newOfferId = baseOfferId ? `${baseOfferId}_COPY${i + 1}_${Date.now()}` : `OFFER_COPY${i + 1}_${Date.now()}`;
          
          // Clean the title of existing (Copy) text before adding new one
          const baseTitle = getBaseTitle(title);
          const newTitle = i === 0 ? `${baseTitle} (Copy)` : `${baseTitle} (Copy ${i + 1})`;
          
          const newOffer = {
            ...rest,
            title: newTitle,
            offer_id: newOfferId,
            tracking_url: null, // Reset tracking URL
            id: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: "pending"
          };
          
          const { error } = await supabase.from("offers").insert(newOffer);
          if (!error) successCount++;
        }
      }
      
      toast({ 
        title: "Offers copied successfully", 
        description: `Created ${successCount} copies with unique Offer IDs` 
      });
      setCopyDialogOpen(false);
      setSelectedOffers(new Set());
      load();
      loadAllOffers();
    } catch (error) {
      toast({ title: "Copy failed", description: String(error), variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const openAdd = () => { 
    // Generate a default unique offer_id suggestion
    const defaultOfferId = `OFFER_${Date.now()}`;
    setForm({ ...defaultForm, offer_id: defaultOfferId }); 
    setEditing(null); 
    setOpen(true); 
  };
  
  const openEdit = (item: any) => { 
    setForm({ 
      ...item, 
      expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : ""
    }); 
    setEditing(item.id); 
    setOpen(true); 
  };

  const save = async () => {
    if (!form.title.trim()) { 
      toast({ title: "Title is required", variant: "destructive" }); 
      return; 
    }

    // Validate that offer_id is provided
    if (!form.offer_id?.trim()) {
      toast({ 
        title: "Offer ID is required", 
        description: "Each offer must have a unique Offer ID for tracking URL generation.",
        variant: "destructive" 
      }); 
      return;
    }

    // Check if offer_id is unique (when creating new offer)
    if (!editing) {
      const { data: existing } = await supabase
        .from("offers")
        .select("offer_id")
        .eq("offer_id", form.offer_id)
        .maybeSingle();
      
      if (existing) {
        toast({ 
          title: "Duplicate Offer ID", 
          description: "This Offer ID already exists. Please use a unique Offer ID.",
          variant: "destructive" 
        });
        return;
      }
    }
    
    let finalForm = { ...form };
    if (!finalForm.traffic_sources && finalForm.title) {
      finalForm.traffic_sources = generateTrafficSource(finalForm.platform, finalForm.title);
    }
    if (!finalForm.vertical && finalForm.title) {
      finalForm.vertical = detectVertical(finalForm.title, finalForm.description);
    }
    if (!finalForm.category && finalForm.title) {
      finalForm.category = detectCategory(finalForm.title, finalForm.description);
    }
    
    // Remove any fields that don't exist in the database
    const payload = { 
      offer_id: finalForm.offer_id, // Required field now
      title: finalForm.title,
      url: finalForm.url,
      preview_url: finalForm.preview_url || null,
      tracking_url: finalForm.tracking_url || null,
      payout: finalForm.payout || 0,
      currency: finalForm.currency || "USD",
      payout_model: finalForm.payout_model || "CPA",
      description: finalForm.description || null,
      countries: finalForm.countries || null,
      platform: finalForm.platform || null,
      device: finalForm.device || null,
      devices: finalForm.devices || null,
      vertical: finalForm.vertical || null,
      category: finalForm.category || null,
      image_url: finalForm.image_url || null,
      traffic_sources: finalForm.traffic_sources || null,
      expiry_date: finalForm.expiry_date || null,
      percent: finalForm.percent || 0,
      non_access_url: finalForm.non_access_url || null,
      status: finalForm.status || "active",
      approval_status: finalForm.approval_status || "pending",
      approved_date: finalForm.approved_date || null,
      approved_by: finalForm.approved_by || null,
      rejection_reason: finalForm.rejection_reason || null,
      network_id: finalForm.network_id || null,
      is_public: finalForm.is_public !== false,
      updated_at: new Date().toISOString()
    };
    
    if (editing) {
      const { error } = await supabase.from("offers").update(payload).eq("id", editing);
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Offer updated!" });
        setOpen(false); 
        load();
      }
    } else {
      const { error } = await supabase.from("offers").insert({
        ...payload,
        created_at: new Date().toISOString()
      });
      if (error) {
        toast({ title: "Create failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Offer created!", description: `Offer ID: ${form.offer_id}` });
        setOpen(false); 
        load();
      }
    }
  };

  const toggleStatus = async (id: string, current: string) => { 
    const newStatus = current === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("offers")
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", id);
    
    if (error) {
      toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Offer ${newStatus === "active" ? "activated" : "deactivated"}` });
      load();
    }
  };

  const moveToRecycleBin = async (id: string, offerData: any) => {
    try {
      setDeletingOffer(id);
      setDeleteProgress(0);
      
      // Simulate progress steps
      setDeleteProgress(25);
      await supabase.from("recycle_bin").insert({ 
        offer_id: id, 
        offer_data: offerData, 
        deleted_at: new Date().toISOString() 
      });
      
      setDeleteProgress(50);
      await supabase.from("offers").update({ 
        is_deleted: true, 
        deleted_at: new Date().toISOString() 
      }).eq("id", id);
      
      setDeleteProgress(75);
      toast({ title: "Offer moved to recycle bin" });
      
      setDeleteProgress(100);
      await Promise.all([
        load(),
        loadRecycleBin()
      ]);
    } catch (error) { 
      console.log("Recycle bin not available, doing permanent delete"); 
      setDeleteProgress(50);
      await supabase.from("offers").delete().eq("id", id); 
      setDeleteProgress(75);
      toast({ title: "Offer permanently deleted" });
      setDeleteProgress(100);
      await load();
    } finally {
      setDeletingOffer(null);
      setDeleteProgress(0);
    }
  };

  const approveOffer = async (offer: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user?.email || "admin";
      
      const { error } = await supabase
        .from("offers")
        .update({ 
          approval_status: "approved",
          approved_date: new Date().toISOString(),
          approved_by: currentUser,
          rejection_reason: "",
          updated_at: new Date().toISOString()
        })
        .eq("id", offer.id);
      
      if (error) {
        toast({ 
          title: "Approval Failed", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Offer Approved!", 
          description: `${offer.title} (ID: ${offer.offer_id}) has been approved successfully` 
        });
        load();
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: String(error), 
        variant: "destructive" 
      });
    }
  };

  const load = () => {
    supabase.from("offers").select("*").eq("is_deleted", false).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error loading offers:", error);
          toast({ title: "Error loading offers", variant: "destructive" });
        } else {
          console.log('🔍 LOAD DEBUG - Updating both items and allOffersData');
          setItems(data || []); // For Active/Inactive/Boosted filtering
          setAllOffersData(data || []); // CRITICAL FIX: Keep All Offers synchronized
        }
      });
  };

  // Load pending offers for All Offers section (offers not yet assigned to Active/Inactive/Boosted)
  const loadAllOffers = () => {
    console.log('🔄 Loading all offers for All Offers tab...');
    console.log('🔍 LOAD DEBUG - Function called successfully');
    
    // Add aggressive cache busting with random parameter
    const cacheBuster = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now();
    console.log('🔍 Cache buster:', cacheBuster);
    console.log('🔍 Timestamp:', timestamp);
    
    // Force a fresh connection by adding a small delay
    setTimeout(() => {
      console.log('🔍 LOAD DEBUG - About to make Supabase query');
      // CRITICAL FIX: Get ALL offers first, then filter manually in frontend
      // Add timestamp to force cache invalidation
      supabase.from("offers").select("*").order("created_at", { ascending: false })
        // IMPORTANT: Set high limit to get ALL records (default is 1000)
        .limit(10000) // Get up to 10,000 records to ensure we get everything
        // Add cache busting by using RPC call with timestamp
        .then(({ data, error }) => {
          console.log('🔍 LOAD DEBUG - Supabase query completed');
          console.log('🔍 LOAD DEBUG - Error:', error);
          console.log('🔍 LOAD DEBUG - Data length:', data?.length || 0);
          
          if (error) {
            console.error("Error loading all offers:", error);
          } else {
            // Store ALL non-deleted offers for All Offers section
            console.log('🔍 Loading all offers - found (RAW):', data?.length || 0);
            console.log('🔍 All offers data sample:', data?.slice(0, 3));
            
            // CRITICAL DEBUG: Check is_deleted values in detail
            if (data && data.length > 0) {
              console.log('🔍 FIRST OFFER DETAILS:', {
                id: data[0].id,
                title: data[0].title,
                is_deleted: data[0].is_deleted,
                is_deleted_type: typeof data[0].is_deleted
              });
              
              // Check all is_deleted values
              const deletedCount = data.filter(o => o.is_deleted === true).length;
              const notDeletedCount = data.filter(o => o.is_deleted === false).length;
              const nullCount = data.filter(o => o.is_deleted === null).length;
              const undefinedCount = data.filter(o => o.is_deleted === undefined).length;
              
              console.log('🔍 IS_DELETED BREAKDOWN:', {
                total: data.length,
                deleted: deletedCount,
                notDeleted: notDeletedCount,
                null: nullCount,
                undefined: undefinedCount
              });
            }
            
            // CRITICAL FIX: Manually filter out deleted offers in frontend
            const nonDeletedOffers = data?.filter(offer => {
              // Filter out offers where is_deleted is true
              return offer.is_deleted !== true;
            }) || [];
            
            console.log('🔍 MANUALLY FILTERED - Non-deleted offers:', nonDeletedOffers.length);
            console.log('🔍 MANUALLY FILTERED - Deleted offers removed:', (data?.length || 0) - nonDeletedOffers.length);
            
            // CRITICAL: Force state update with manually filtered data
            console.log('🔄 BEFORE setAllOffersData - current allOffersData.length:', allOffersData.length);
            console.log('🔄 ABOUT TO UPDATE STATE - New count will be:', nonDeletedOffers.length);
            
            // CRITICAL FIX: Force re-render by using refresh key
            setAllOffersData(nonDeletedOffers);
            setRefreshKey(prev => prev + 1); // Force component re-render
            
            // Force a re-render by checking state after update
            setTimeout(() => {
              console.log('🔄 AFTER setAllOffersData - new allOffersData.length:', allOffersData.length);
              console.log('🔄 STATE UPDATE CHECK - Did count change?', allOffersData.length !== nonDeletedOffers.length ? 'NO - State not updated!' : 'YES - State updated!');
              console.log('🔄 REFRESH KEY - New refresh key:', refreshKey + 1);
            }, 50);
          }
        });
    }, 100); // 100ms delay to ensure database consistency
  };

  const loadRecycleBin = async () => {
    const items = await getRecycleBinItems();
    setRecycleBinItems(items);
  };

  const loadMissingOffersReports = async () => {
    const reports = await getMissingOffersReports();
    setMissingOffersReports(reports);
  };

  // Load duplicate groups for Duplicates tab
  const loadDuplicateGroups = async () => {
    setLoadingDuplicates(true);
    try {
      const result = await findDuplicateOffers();
      setDuplicateGroups(result.duplicateGroups);
    } catch (error) {
      console.error("Error loading duplicate groups:", error);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const handleGoogleSheetImport = async (sheetUrl: string) => {
    if (!sheetUrl) {
      toast({ title: "Please enter a Google Sheets URL", variant: "destructive" });
      return;
    }

    setProcessingBulkImport(true);
    try {
      const { parseGoogleSheet } = await import("@/lib/bulkImportUtils");
      const sheetData = await parseGoogleSheet(sheetUrl);

      let processedData = sheetData.map((offer: any, index: number) => {
        // Ensure each offer has a unique offer_id
        const offerId = offer.offer_id || `IMPORTED_${Date.now()}_${index}`;
        
        const withDefaults = {
          ...offer,
          offer_id: offerId,
          payout: offer.payout ? Number(offer.payout) : 0,
          currency: offer.currency || "USD",
          payout_model: offer.payout_model || "CPA",
          status: "pending",
          is_public: offer.is_public !== "false" && offer.is_public !== "0",
        };
        return autoFillOfferData(withDefaults);
      });

      const duplicates = await checkBatchDuplicates(processedData);
      setDuplicateMatches(duplicates);

      const previewData = processedData.map((offer: any, index: number) => ({
        ...offer,
        isDuplicate: duplicates.has(index),
        duplicateMatch: duplicates.get(index),
      }));

      for (let i = 0; i < previewData.length; i++) {
        if (!previewData[i].image_url) {
          try {
            const imageUrl = await generateOfferImage(previewData[i].title, previewData[i].description, previewData[i].category, previewData[i].vertical);
            previewData[i].image_url = imageUrl;
          } catch (error) { console.error("Error generating image:", error); }
        }
      }

      setBulkImportPreview(previewData);
      setShowBulkPreview(true);
      if (duplicates.size > 0) {
        toast({ 
          title: "Google Sheet Parsed Successfully", 
          description: `Found ${processedData.length} offers. ${duplicates.size} duplicates detected.`,
          variant: "destructive"
        });
      } else {
        toast({ title: "Google Sheet Parsed Successfully", description: `Found ${processedData.length} offers ready to import.` });
      }
    } catch (error: any) {
      console.error("Error parsing Google Sheet:", error);
      toast({ title: "Google Sheet Parse Error", description: error.message || String(error), variant: "destructive" });
    } finally {
      setProcessingBulkImport(false);
    }
  };

  const handleBulkCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingBulkImport(true);
    try {
      const csvData = await parseCSV(file);

      let processedData = csvData.map((offer, index) => {
        // Ensure each offer has a unique offer_id
        const offerId = offer.offer_id || `CSV_${Date.now()}_${index}`;
        
        const withDefaults = {
          ...offer,
          offer_id: offerId,
          payout: offer.payout ? Number(offer.payout) : 0,
          currency: offer.currency || "USD",
          payout_model: offer.payout_model || "CPA",
          status: "pending",
          is_public: offer.is_public !== "false" && offer.is_public !== "0",
        };
        return autoFillOfferData(withDefaults);
      });

      const duplicates = await checkBatchDuplicates(processedData);
      setDuplicateMatches(duplicates);

      const previewData = processedData.map((offer, index) => ({
        ...offer,
        isDuplicate: duplicates.has(index),
        duplicateMatch: duplicates.get(index),
      }));

      for (let i = 0; i < previewData.length; i++) {
        if (!previewData[i].image_url) {
          try {
            const imageUrl = await generateOfferImage(previewData[i].title, previewData[i].description, previewData[i].category, previewData[i].vertical);
            previewData[i].image_url = imageUrl;
          } catch (error) { console.error("Error generating image:", error); }
        }
      }

      setBulkImportPreview(previewData);
      setShowBulkPreview(true);
      toast({ title: "CSV Parsed Successfully", description: `Found ${processedData.length} offers with unique IDs. ${duplicates.size} duplicates detected.` });
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast({ title: "CSV Parse Error", description: String(error), variant: "destructive" });
    } finally {
      setProcessingBulkImport(false);
    }
  };

  const processBulkImport = async () => {
    if (bulkImportPreview.length === 0) return;

    // First check for duplicates and show dialog if found
    const duplicates = await checkBatchDuplicates(bulkImportPreview);
    if (duplicates.size > 0) {
      const duplicateList: any[] = [];
      duplicates.forEach((duplicateMatch, index) => {
        duplicateList.push({
          uploaded: bulkImportPreview[index],
          existing: duplicateMatch.existingOfferData
        });
      });
      setDuplicateOffers(duplicateList);
      setDuplicateOffersDialogOpen(true);
      return;
    }

    // If no duplicates, proceed with import
    await doProcessBulkImport(false, bulkUploadStatus);
  };

  // Actual import function
  const doProcessBulkImport = async (forceUploadAll = false, status = "pending") => {
    setBulkUploading(true);
    setUploadProgress(0);
    const batchId = crypto.randomUUID();
    let successCount = 0, failCount = 0, skippedCount = 0;
    const totalItems = bulkImportPreview.length;

    // CRITICAL DEBUG: Check if preview data exists
    console.log('🔍 IMPORT DEBUG - bulkImportPreview.length:', bulkImportPreview.length);
    console.log('🔍 IMPORT DEBUG - bulkImportPreview data:', bulkImportPreview.slice(0, 3));
    console.log('🔍 IMPORT DEBUG - totalItems:', totalItems);

    if (totalItems === 0) {
      console.error('❌ IMPORT ERROR: No items to import - bulkImportPreview is empty');
      toast({ title: "Import Error", description: "No offers to import - preview is empty", variant: "destructive" });
      setBulkUploading(false);
      return;
    }

    // CRITICAL DEBUG: Check current allOffersData state before import
    console.log('🔍 IMPORT DEBUG - Before import allOffersData.length:', allOffersData.length);
    
    // CRITICAL DEBUG: Check if we can see the offers that will be imported
    console.log('🔍 IMPORT DEBUG - Sample offers to be imported:', bulkImportPreview.slice(0, 2));

    try {
      for (let i = 0; i < bulkImportPreview.length; i++) {
        const offer = bulkImportPreview[i];

        console.log(`🔍 PROCESSING OFFER ${i + 1}/${totalItems}:`, {
          title: offer.title,
          offer_id: offer.offer_id,
          isDuplicate: offer.isDuplicate,
          hasRequiredFields: !!(offer.offer_id && offer.title)
        });

        // Skip duplicates unless forceUploadAll is true
        if (!forceUploadAll && skipDuplicates && offer.isDuplicate) {
          console.log(`⏭️ SKIPPING DUPLICATE: ${offer.title}`);
          skippedCount++;
          await logDuplicateDetection(batchId, offer.title, offer.duplicateMatch?.existingOfferId || null, offer.duplicateMatch?.matchingFields || [], "skipped");
          // Update progress
          setUploadProgress(Math.round(((i + 1) / totalItems) * 100));
          continue;
        }

        // Skip if no offer_id
        if (!offer.offer_id) {
          console.log(`❌ SKIPPING - NO OFFER_ID: ${offer.title}`);
          failCount++;
          setUploadProgress(Math.round(((i + 1) / totalItems) * 100));
          continue;
        }

        const validation = validateOfferData(offer);
        console.log(`🔍 VALIDATION RESULT for ${offer.title}:`, validation);
        if (!validation.valid) { 
          console.log(`❌ SKIPPING - VALIDATION FAILED: ${offer.title}`, validation.errors);
          failCount++; 
          setUploadProgress(Math.round(((i + 1) / totalItems) * 100));
          continue; 
        }

        const offerData = {
          offer_id: offer.offer_id,
          title: offer.title, 
          url: offer.url, 
          payout: offer.payout || 0,
          currency: offer.currency || "USD", 
          payout_model: offer.payout_model || "CPA", 
          description: offer.description || null,
          countries: offer.countries || null, 
          platform: offer.platform || null, 
          device: offer.device || null,
          preview_url: offer.preview_url || null, 
          image_url: offer.image_url || null, 
          traffic_sources: offer.traffic_sources || null,
          vertical: offer.vertical || null, 
          category: offer.category || null, 
          devices: offer.devices || null,
          expiry_date: offer.expiry_date || null, 
          non_access_url: offer.non_access_url || null, 
          percent: offer.percent || 0, 
          status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        console.log(`🔍 INSERTING OFFER: ${offer.title}`, offerData);

        const { error } = await supabase.from("offers").insert(offerData);
        if (error) { 
          console.error(`❌ DATABASE ERROR for ${offer.title}:`, error);
          failCount++; 
        } else { 
          console.log(`✅ SUCCESSFULLY INSERTED: ${offer.title}`);
          console.log(`🔍 INSERTED OFFER DATA:`, offerData);
          successCount++; 
          
          // CRITICAL DEBUG: Check if this offer appears in database immediately
          setTimeout(async () => {
            const { data: checkData } = await supabase.from("offers").select("*").eq("offer_id", offer.offer_id).single();
            console.log(`🔍 DATABASE CHECK - Is ${offer.title} in database?`, checkData ? 'YES' : 'NO');
            if (checkData) {
              console.log(`🔍 DATABASE CHECK - Offer details:`, {
                id: checkData.id,
                title: checkData.title,
                is_deleted: checkData.is_deleted,
                created_at: checkData.created_at
              });
            }
          }, 100);
        }

        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalItems) * 100));
      }

      // Set summary
      setUploadSummary({
        total: totalItems,
        valid: successCount,
        duplicates: skippedCount,
        invalid: failCount
      });

      // CRITICAL DEBUG: Final import summary
      console.log('🎉 IMPORT SUMMARY:', {
        total: totalItems,
        successCount,
        failCount,
        skippedCount,
        finalCounts: { successCount, failCount, skippedCount }
      });
      
      // CRITICAL DEBUG: Check allOffersData immediately after import
      console.log('🔍 POST-IMPORT DEBUG - allOffersData.length after import:', allOffersData.length);
      console.log('🔍 POST-IMPORT DEBUG - Expected count should be:', (allOffersData.length || 0) + successCount);

      toast({ title: "Bulk Import Complete", description: `Successfully imported: ${successCount}, Failed: ${failCount}, Skipped: ${skippedCount}` });
      setBulkImportPreview([]); 
      setShowBulkPreview(false); 
      setDuplicateMatches(new Map()); 
      setDuplicateOffersDialogOpen(false);
      
      // Reload all relevant data based on upload status
      if (bulkUploadStatus === "boosted") {
        await Promise.all([load(), loadBoostedOffers(), loadAllOffers()]);
      } else {
        await Promise.all([load(), loadAllOffers(), loadBoostedOffers()]);
      }
    } catch (error) {
      console.error("Error processing bulk import:", error);
      toast({ title: "Bulk Import Error", description: String(error), variant: "destructive" });
    } finally {
      setBulkUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle upload anyway (force upload all including duplicates)
  const handleUploadAnyway = async () => {
    await doProcessBulkImport(true, bulkUploadStatus);
  };

  // Handle skip duplicates
  const handleSkipDuplicates = async () => {
    await doProcessBulkImport(false, bulkUploadStatus);
  };

  // Handle remove duplicates (filter out duplicates from preview)
  const handleRemoveDuplicates = async () => {
    const filteredPreview = bulkImportPreview.filter(offer => !offer.isDuplicate);
    setBulkImportPreview(filteredPreview);
    setDuplicateOffersDialogOpen(false);
    toast({ title: "Duplicates Removed", description: `${bulkImportPreview.length - filteredPreview.length} duplicate(s) removed from import` });
  };

  const handleMultipleDelete = async () => {
    if (selectedOffers.size === 0) { 
      toast({ title: "No offers selected", variant: "destructive" }); 
      return; 
    }

    const offerMap = new Map<string, any>();
    selectedOffers.forEach((id) => { 
      const offer = items.find((o) => o.id === id); 
      if (offer) offerMap.set(id, offer); 
    });

    try {
      const result = await moveMultipleToRecycleBin(Array.from(selectedOffers), offerMap);
      toast({ title: "Offers Deleted", description: `Successfully deleted ${result.successful} offer${result.successful !== 1 ? 's' : ''}` });
      setSelectedOffers(new Set()); 
      
      // Add small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload all data
      await Promise.all([
        load(),
        loadAllOffers(),
        loadBoostedOffers(),
        loadRecycleBin()
      ]);
    } catch (error) {
      console.error("Error in bulk delete:", error);
      toast({ title: "Delete failed", description: String(error), variant: "destructive" });
    }
  };

  const handleCheckMissingOffers = async () => {
    const file = document.createElement("input"); 
    file.type = "file"; 
    file.accept = ".csv";
    file.onchange = async (e: any) => {
      setProcessingBulkImport(true);
      try {
        const csvData = await parseCSV(e.target.files[0]);
        const result = await detectMissingOffers(csvData);
        await saveMissingOffersReport(crypto.randomUUID(), `Missing Offers Report - ${new Date().toLocaleString()}`, csvData, result.missingOffers, ["name", "payout", "country", "platform"]);
        loadMissingOffersReports();
        toast({ title: "Report Generated", description: `Found ${result.missingOffers.length} missing offers out of ${result.totalUploaded}` });
      } catch (error) { 
        toast({ title: "Error", description: String(error), variant: "destructive" }); 
      }
      finally { setProcessingBulkImport(false); }
    };
    file.click();
  };

  // Handle boost offers
  const handleBoostOffers = async () => {
    if (selectedOffers.size === 0) {
      toast({ title: "No offers selected", variant: "destructive" });
      return;
    }
    if (!boostDate) {
      toast({ title: "Please select an expiry date", variant: "destructive" });
      return;
    }
    setBoosting(true);
    try {
      let successCount = 0;
      for (const offerId of selectedOffers) {
        const { error } = await supabase.from("offers").update({ 
          status: "boosted",
          percent: boostPercent, 
          expiry_date: boostDate,
          updated_at: new Date().toISOString()
        }).eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ 
        title: "Boost Applied!", 
        description: `${successCount} offers boosted with ${boostPercent}% extra until ${new Date(boostDate).toLocaleDateString()}` 
      });
      setShowBoostDialog(false);
      setSelectedOffers(new Set());
      load();
      loadAllOffers();
    } catch (error) {
      toast({ title: "Boost failed", description: String(error), variant: "destructive" });
    } finally {
      setBoosting(false);
    }
  };

  // Handle extra boost for boosted offers
  const handleExtraBoost = async () => {
    if (selectedBoostedOffers.size === 0) {
      toast({ title: "No boosted offers selected", variant: "destructive" });
      return;
    }
    if (!extraBoostDate) {
      toast({ title: "Please select an expiry date", variant: "destructive" });
      return;
    }
    
    setExtraBoosting(true);
    try {
      let successCount = 0;
      for (const offerId of selectedBoostedOffers) {
        const { error } = await supabase
          .from("offers")
          .update({ 
            percent: extraBoostPercent, 
            expiry_date: extraBoostDate,
            updated_at: new Date().toISOString()
          })
          .eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ 
        title: "Extra Boost Applied!", 
        description: `${successCount} offers boosted with ${extraBoostPercent}% extra until ${new Date(extraBoostDate).toLocaleDateString()}` 
      });
      setExtraBoostDialog(false);
      setSelectedBoostedOffers(new Set());
      loadBoostedOffers();
    } catch (error) {
      toast({ title: "Extra boost failed", description: String(error), variant: "destructive" });
    } finally {
      setExtraBoosting(false);
    }
  };

  // Pause boosted offers
  const handlePauseBoostedOffers = async () => {
    if (selectedBoostedOffers.size === 0) {
      toast({ title: "No boosted offers selected", variant: "destructive" });
      return;
    }
    
    try {
      let successCount = 0;
      for (const offerId of selectedBoostedOffers) {
        const { error } = await supabase
          .from("offers")
          .update({ 
            percent: 0, 
            expiry_date: null,
            updated_at: new Date().toISOString()
          })
          .eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ 
        title: "Boost Paused!", 
        description: `${successCount} offers had their boost removed`
      });
      setSelectedBoostedOffers(new Set());
      loadBoostedOffers();
    } catch (error) {
      toast({ 
        title: "Pause boost failed", 
        description: String(error), 
        variant: "destructive" 
      });
    }
  };

  // Delete boosted offers
  const handleDeleteBoostedOffers = async () => {
    if (selectedBoostedOffers.size === 0) {
      toast({ title: "No boosted offers selected", variant: "destructive" });
      return;
    }
    
    try {
      let successCount = 0;
      for (const offerId of selectedBoostedOffers) {
        const offer = boostedOffers.find(o => o.id === offerId);
        if (offer) {
          await moveToRecycleBin(offerId, offer);
          successCount++;
        }
      }
      toast({ 
        title: "Deleted!", 
        description: `Successfully deleted ${successCount} boosted offer${successCount !== 1 ? 's' : ''}` 
      });
      setSelectedBoostedOffers(new Set());
      
      // Add small delay to ensure database operations complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload all data
      await Promise.all([
        loadBoostedOffers(),
        load(),
        loadAllOffers(),
        loadRecycleBin()
      ]);
    } catch (error) {
      toast({ title: "Delete failed", description: String(error), variant: "destructive" });
    }
  };

  // Individual action handlers for boosted offers
  const handleExtraBoostSingle = (offer: any) => {
    setSelectedBoostedOffers(new Set([offer.id]));
    setExtraBoostPercent(20);
    setExtraBoostDate("");
    setExtraBoostDialog(true);
  };

  const handlePauseBoostSingle = async (offer: any) => {
    setSelectedBoostedOffers(new Set([offer.id]));
    await handlePauseBoostedOffers();
  };

  const handleDeleteBoostSingle = async (offer: any) => {
    setSelectedBoostedOffers(new Set([offer.id]));
    await handleDeleteBoostedOffers();
  };

  // Auto-generate image, vertical and category when title or description changes
  const handleTitleOrDescriptionChange = async (field: string, value: string) => {
    const newForm = { ...form, [field]: value };
    setForm(newForm);

    if ((field === 'title' || field === 'description') && newForm.title) {
      const currentTitle = field === 'title' ? value : newForm.title;
      const currentDesc = field === 'description' ? value : newForm.description;
      
      if (currentTitle && currentTitle.length >= 3) {
        setGeneratingImage(true);
        try {
          const detectedVertical = detectVertical(currentTitle, currentDesc);
          const detectedCategory = detectCategory(currentTitle, currentDesc);
          
          let imageUrl = newForm.image_url;
          if (!imageUrl) {
            imageUrl = await generateOfferImage(currentTitle, currentDesc, detectedCategory, detectedVertical);
          }
          
          setForm((f: any) => ({
            ...f,
            [field]: value,
            vertical: detectedVertical,
            category: detectedCategory,
            image_url: imageUrl
          }));
          
          if (!newForm.image_url) {
            toast({ title: "Image, vertical and category auto-generated!" });
          }
        } catch (error) {
          console.error("Error generating image:", error);
        } finally {
          setGeneratingImage(false);
        }
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `offers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("survey-provider-images").upload(path, file);
    if (error) { 
      toast({ title: "Upload failed", description: error.message, variant: "destructive" }); 
      setUploading(false); 
      return; 
    }
    const { data: { publicUrl } } = supabase.storage.from("survey-provider-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast({ title: "Image uploaded!" });
  };

  const renderAllOffersTable = () => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox 
                  checked={selectedOffers.size === allOffersData.length && allOffersData.length > 0} 
                  onCheckedChange={(checked) => { 
                    if (checked) setSelectedOffers(new Set(allOffersData.map((o) => o.id))); 
                    else setSelectedOffers(new Set()); 
                  }} 
                />
              </TableHead>
              <TableHead>Offer ID</TableHead>
              <TableHead>Network ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Countries</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Traffic Sources</TableHead>
              <TableHead>Tracking URL</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allOffersData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  No offers found
                </TableCell>
              </TableRow>
            ) : (
              allOffersData.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedOffers.has(o.id)} 
                      onCheckedChange={(checked) => { 
                        const newSelected = new Set(selectedOffers); 
                        if (checked) newSelected.add(o.id); 
                        else newSelected.delete(o.id); 
                        setSelectedOffers(newSelected); 
                      }} 
                    />
                  </TableCell>
                  <TableCell className="text-sm font-mono font-semibold text-blue-600">
                    {o.offer_id || "-"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{o.network_id || "-"}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={o.title}>
                    {o.title}
                  </TableCell>
                  <TableCell>${Number(o.payout || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{o.countries || "-"}</TableCell>
                  <TableCell>{o.platform || "-"}</TableCell>
                  <TableCell>{o.device || "-"}</TableCell>
                  <TableCell>{o.vertical || "-"}</TableCell>
                  <TableCell>{o.category || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={
                    o.traffic_sources ? 
                    (Array.isArray(o.traffic_sources) ? 
                      o.traffic_sources.join(", ") : 
                      o.traffic_sources
                    ) : "-"
                  }>
                    {o.traffic_sources ? 
                      (Array.isArray(o.traffic_sources) ? 
                        o.traffic_sources.join(", ") : 
                        o.traffic_sources
                      ) : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {o.tracking_url ? (
                      <div className="flex items-center gap-1">
                        <a 
                          href={o.tracking_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate max-w-[150px]"
                          title={o.tracking_url}
                        >
                          {o.tracking_url.substring(0, 20)}...
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => generateTrackingUrl(o)}
                          disabled={generatingTrackingUrl && generatingForOffer === o.id}
                          title="Regenerate Tracking URL"
                        >
                          <RefreshCw className={`h-3 w-3 ${generatingTrackingUrl && generatingForOffer === o.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => generateTrackingUrl(o)}
                        disabled={!o.offer_id || (generatingTrackingUrl && generatingForOffer === o.id)}
                        title={!o.offer_id ? "Offer ID required first" : "Generate Tracking URL"}
                      >
                        {generatingTrackingUrl && generatingForOffer === o.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1" />
                        )}
                        {!o.offer_id ? "Need ID" : "Generate"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      {o.status === "active" && o.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-green-500" />
                          <span>Active since: {new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {o.status === "inactive" && o.updated_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-red-500" />
                          <span>Inactive since: {new Date(o.updated_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {o.expiry_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span>Expires: {new Date(o.expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => viewOfferDetails(o)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-green-500 hover:bg-green-600 text-white" 
                        onClick={() => {
                          setSelectedOffers(new Set([o.id]));
                          handleMakeActive();
                        }} 
                        title="Make Active"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-gray-500 hover:bg-gray-600 text-white"
                        onClick={() => {
                          setSelectedOffers(new Set([o.id]));
                          handleMakeInactive();
                        }} 
                        title="Make Inactive"
                      >
                        <XCircle className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-yellow-500 hover:bg-yellow-600 text-white"
                        onClick={() => {
                          setSelectedOffers(new Set([o.id]));
                          handleMakeBoosted();
                        }} 
                        title="Make Boosted"
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={async () => {
                          await moveToRecycleBin(o.id, o);
                          // Reload data after individual delete
                          await Promise.all([
                            load(),
                            loadAllOffers(),
                            loadBoostedOffers(),
                            loadRecycleBin()
                          ]);
                        }}
                        disabled={deletingOffer === o.id}
                        title="Delete"
                      >
                        {deletingOffer === o.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const renderOfferTable = (offers: any[], type: 'active' | 'inactive') => {
    const currentSelected = type === 'active' ? selectedActiveOffers : selectedInactiveOffers;
    const setCurrentSelected = type === 'active' ? setSelectedActiveOffers : setSelectedInactiveOffers;
    
    return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox 
                  checked={currentSelected.size === offers.length && offers.length > 0} 
                  onCheckedChange={(checked) => { 
                    if (checked) {
                      const newSelected = new Set(currentSelected);
                      offers.forEach(o => newSelected.add(o.id));
                      setCurrentSelected(newSelected);
                    } else {
                      setCurrentSelected(new Set());
                    }
                  }} 
                />
              </TableHead>
              <TableHead>Network ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead>Countries</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Vertical</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Tracking URL</TableHead>
              <TableHead>Timeline</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  No {type} offers found
                </TableCell>
              </TableRow>
            ) : (
              offers.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Checkbox 
                      checked={currentSelected.has(o.id)} 
                      onCheckedChange={(checked) => { 
                        const newSelected = new Set(currentSelected); 
                        if (checked) newSelected.add(o.id); 
                        else newSelected.delete(o.id); 
                        setCurrentSelected(newSelected); 
                      }} 
                    />
                  </TableCell>
                  <TableCell className="text-sm font-mono font-semibold text-blue-600">
                    {o.offer_id || "-"}
                  </TableCell>
                  <TableCell className="text-sm font-mono">{o.network_id || "-"}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={o.title}>
                    {o.title}
                  </TableCell>
                  <TableCell>${Number(o.payout || 0).toFixed(2)}</TableCell>
                  <TableCell className="text-xs">{o.countries || "-"}</TableCell>
                  <TableCell>{o.platform || "-"}</TableCell>
                  <TableCell>{o.device || "-"}</TableCell>
                  <TableCell>{o.vertical || "-"}</TableCell>
                  <TableCell>{o.category || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={
                    o.traffic_sources ? 
                    (Array.isArray(o.traffic_sources) ? 
                      o.traffic_sources.join(", ") : 
                      o.traffic_sources
                    ) : "-"
                  }>
                    {o.traffic_sources ? 
                      (Array.isArray(o.traffic_sources) ? 
                        o.traffic_sources.join(", ") : 
                        o.traffic_sources
                      ) : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {o.tracking_url ? (
                      <div className="flex items-center gap-1">
                        <a 
                          href={o.tracking_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate max-w-[150px]"
                          title={o.tracking_url}
                        >
                          {o.tracking_url.substring(0, 20)}...
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => generateTrackingUrl(o)}
                          disabled={generatingTrackingUrl && generatingForOffer === o.id}
                          title="Regenerate Tracking URL"
                        >
                          <RefreshCw className={`h-3 w-3 ${generatingTrackingUrl && generatingForOffer === o.id ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => generateTrackingUrl(o)}
                        disabled={!o.offer_id || (generatingTrackingUrl && generatingForOffer === o.id)}
                        title={!o.offer_id ? "Offer ID required first" : "Generate Tracking URL"}
                      >
                        {generatingTrackingUrl && generatingForOffer === o.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Link2 className="h-3 w-3 mr-1" />
                        )}
                        {!o.offer_id ? "Need ID" : "Generate"}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs">
                      {o.status === "active" && o.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-green-500" />
                          <span>Active since: {new Date(o.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {o.status === "inactive" && o.updated_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-red-500" />
                          <span>Inactive since: {new Date(o.updated_at).toLocaleDateString()}</span>
                        </div>
                      )}
                      {o.expiry_date && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-orange-500" />
                          <span>Expires: {new Date(o.expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.status === "active" ? "default" : "secondary"}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => viewOfferDetails(o)}
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyOfferDetailsToClipboard(o)}
                        title="Copy details to clipboard"
                      >
                        <Clipboard className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => copyOffer(o)}
                        title="Duplicate offer"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => openEdit(o)}
                        title="Edit"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Switch 
                        checked={o.status === "active"} 
                        onCheckedChange={() => toggleStatus(o.id, o.status)}
                        title="Toggle Status"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-green-500 hover:bg-green-600 text-white" 
                        onClick={() => approveOffer(o)} 
                        title="Approve"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={async () => {
                          await moveToRecycleBin(o.id, o);
                          // Reload data after individual delete
                          await Promise.all([
                            load(),
                            loadAllOffers(),
                            loadBoostedOffers(),
                            loadRecycleBin()
                          ]);
                        }}
                        disabled={deletingOffer === o.id}
                        title="Delete"
                      >
                        {deletingOffer === o.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" key={`offers-tab-${refreshKey}`}>
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="offers">All Offers ({allOffersData.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeOffers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveOffers.length})</TabsTrigger>
          <TabsTrigger value="boosted">Boosted ({boostedOffers.length})</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="missing">Missing</TabsTrigger>
          <TabsTrigger value="recycle">Recycle ({recycleBinItems.length})</TabsTrigger>
        </TabsList>

        {/* All Offers Tab - NEW SECTION */}
        <TabsContent value="offers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">All Offers Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage pending offers - Assign to Active, Inactive, or Boosted sections
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openAdd} variant="default">
                <Plus className="h-4 w-4 mr-2" /> Add Offer
              </Button>
              <Button 
                onClick={() => exportToCsv(allOffersData, `all_offers_${new Date().toISOString().split('T')[0]}.csv`)} 
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button 
                onClick={() => {
                  console.log(' Manual refresh triggered for All Offers');
                  loadAllOffers();
                }}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh All Offers
              </Button>
              {selectedOffers.size > 0 && (
                <>
                  <Button 
                    onClick={handleMakeActive} 
                    variant="outline"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Make Active ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={handleMakeInactive} 
                    variant="outline"
                    className="bg-gray-500 hover:bg-gray-600 text-white"
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Make Inactive ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={handleMakeBoosted} 
                    variant="outline" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" /> Make Boosted ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={generateBulkTrackingUrls} 
                    variant="outline"
                    disabled={generatingTrackingUrl}
                  >
                    {generatingTrackingUrl ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Generate URLs ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={copyMultipleOffersDetails} 
                    variant="outline"
                  >
                    <Clipboard className="h-4 w-4 mr-2" /> Copy Details ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={() => setCopyDialogOpen(true)} 
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Duplicate ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={handleMultipleDelete} 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedOffers.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            {(categoryFilter !== "all" || deviceFilter !== "all" || countryFilter !== "all" || networkFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          {/* Bulk Selection */}
          <div className="flex items-center gap-2">
            <Select value={String(bulkSelectCount)} onValueChange={(v) => setBulkSelectCount(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 offers</SelectItem>
                <SelectItem value="100">100 offers</SelectItem>
                <SelectItem value="200">200 offers</SelectItem>
                <SelectItem value="300">300 offers</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleBulkSelect} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" /> Select {bulkSelectCount} offers
            </Button>
          </div>

          {renderAllOffersTable()}
        </TabsContent>

        {/* Active Offers Tab */}
        <TabsContent value="active" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Active Offers Management</h1>
              <p className="text-sm text-muted-foreground">
                Showing {paginatedActiveOffers.length} of {filteredActiveOffers.length} active offers
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openAdd} variant="default">
                <Plus className="h-4 w-4 mr-2" /> Add Offer
              </Button>
              <Button 
                onClick={exportActiveOffers} 
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              
              {/* Bulk Selection Dropdown */}
              <Select value={activeBulkSelect} onValueChange={setActiveBulkSelect}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Select 50</SelectItem>
                  <SelectItem value="100">Select 100</SelectItem>
                  <SelectItem value="200">Select 200</SelectItem>
                  <SelectItem value="300">Select 300</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Bulk Status Management Buttons */}
              {selectedActiveOffers.size > 0 && (
                <>
                  <Button 
                    onClick={handleBulkMakeInactive} 
                    variant="outline"
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Pause className="h-4 w-4 mr-2" /> Make Inactive ({selectedActiveOffers.size})
                  </Button>
                  <Button 
                    onClick={handleBulkBoost} 
                    variant="outline" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" /> Make Boosted ({selectedActiveOffers.size})
                  </Button>
                </>
              )}
              {selectedOffers.size > 0 && (
                <>
                  <Button 
                    onClick={generateBulkTrackingUrls} 
                    variant="outline"
                    disabled={generatingTrackingUrl}
                  >
                    {generatingTrackingUrl ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Generate URLs ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={copyMultipleOffersDetails} 
                    variant="outline"
                  >
                    <Clipboard className="h-4 w-4 mr-2" /> Copy Details ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={() => setCopyDialogOpen(true)} 
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Duplicate ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={viewMultipleOffersDetails} 
                    variant="outline"
                  >
                    <Info className="h-4 w-4 mr-2" /> View ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={() => setShowBoostDialog(true)} 
                    variant="outline" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" /> Boost ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={handleMultipleDelete} 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedOffers.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            {(categoryFilter !== "all" || deviceFilter !== "all" || countryFilter !== "all" || networkFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          {renderOfferTable(paginatedActiveOffers, 'active')}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredActiveOffers.length)} of {filteredActiveOffers.length} offers
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Inactive Offers Tab */}
        <TabsContent value="inactive" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Inactive Offers Management</h1>
              <p className="text-sm text-muted-foreground">
                Showing {paginatedInactiveOffers.length} of {filteredInactiveOffers.length} inactive offers
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openAdd} variant="default">
                <Plus className="h-4 w-4 mr-2" /> Add Offer
              </Button>
              
              {/* Bulk Selection Dropdown */}
              <Select value={inactiveBulkSelect} onValueChange={setInactiveBulkSelect}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">Select 50</SelectItem>
                  <SelectItem value="100">Select 100</SelectItem>
                  <SelectItem value="200">Select 200</SelectItem>
                  <SelectItem value="300">Select 300</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Bulk Status Management Buttons */}
              {selectedInactiveOffers.size > 0 && (
                <>
                  <Button 
                    onClick={handleBulkMakeActive} 
                    variant="outline"
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" /> Make Active ({selectedInactiveOffers.size})
                  </Button>
                  <Button 
                    onClick={handleBulkBoost} 
                    variant="outline" 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Zap className="h-4 w-4 mr-2" /> Make Boosted ({selectedInactiveOffers.size})
                  </Button>
                </>
              )}
              {selectedOffers.size > 0 && (
                <>
                  <Button 
                    onClick={generateBulkTrackingUrls} 
                    variant="outline"
                    disabled={generatingTrackingUrl}
                  >
                    {generatingTrackingUrl ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="h-4 w-4 mr-2" />
                    )}
                    Generate URLs ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={copyMultipleOffersDetails} 
                    variant="outline"
                  >
                    <Clipboard className="h-4 w-4 mr-2" /> Copy Details ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={() => setCopyDialogOpen(true)} 
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" /> Duplicate ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={viewMultipleOffersDetails} 
                    variant="outline"
                  >
                    <Info className="h-4 w-4 mr-2" /> View ({selectedOffers.size})
                  </Button>
                  <Button 
                    onClick={handleMultipleDelete} 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedOffers.size})
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            {(categoryFilter !== "all" || deviceFilter !== "all" || countryFilter !== "all" || networkFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-3 w-3 mr-1" /> Clear Filters
              </Button>
            )}
          </div>

          {renderOfferTable(paginatedInactiveOffers, 'inactive')}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredInactiveOffers.length)} of {filteredInactiveOffers.length} offers
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Boosted Offers Tab */}
        <TabsContent value="boosted" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Boosted Offers</h2>
                <p className="text-sm text-muted-foreground">Manage offers with boost percentages</p>
              </div>
              <div className="flex gap-2">
                {/* Bulk Selection Dropdown */}
                <Select value={boostedBulkSelect} onValueChange={setBoostedBulkSelect}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">Select 50</SelectItem>
                    <SelectItem value="100">Select 100</SelectItem>
                    <SelectItem value="200">Select 200</SelectItem>
                    <SelectItem value="300">Select 300</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Bulk Status Management Buttons */}
                {selectedBoostedOffers.size > 0 && (
                  <>
                    <Button 
                      onClick={handleBulkUnboost} 
                      variant="outline"
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      <Pause className="h-4 w-4 mr-2" /> Make Active ({selectedBoostedOffers.size})
                    </Button>
                  </>  
                )}
                
                {/* Filters for Boosted Offers */}
                <div className="flex flex-wrap gap-2 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      {devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={countryFilter} onValueChange={setCountryFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={networkFilter} onValueChange={setNetworkFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Networks</SelectItem>
                      {networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {(categoryFilter !== "all" || deviceFilter !== "all" || countryFilter !== "all" || networkFilter !== "all") && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3 w-3 mr-1" /> Clear Filters
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox 
                          checked={selectedBoostedOffers.size === filteredBoostedOffersList.length && filteredBoostedOffersList.length > 0} 
                          onCheckedChange={(checked) => { 
                            if (checked) setSelectedBoostedOffers(new Set(filteredBoostedOffersList.map((o) => o.id))); 
                            else setSelectedBoostedOffers(new Set()); 
                          }} 
                        />
                      </TableHead>
                      <TableHead>Offer ID</TableHead>
                      <TableHead>Network ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Payout</TableHead>
                      <TableHead>Countries</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Tracking URL</TableHead>
                      <TableHead>Boost %</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBoostedOffersList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={16} className="text-center text-muted-foreground py-8">
                          No boosted offers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredBoostedOffersList.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedBoostedOffers.has(o.id)} 
                              onCheckedChange={(checked) => { 
                                const newSelected = new Set(selectedBoostedOffers); 
                                if (checked) newSelected.add(o.id); 
                                else newSelected.delete(o.id); 
                                setSelectedBoostedOffers(newSelected); 
                              }} 
                            />
                          </TableCell>
                          <TableCell className="text-sm font-mono text-blue-600">{o.offer_id || "-"}</TableCell>
                          <TableCell className="text-sm font-mono">{o.network_id || "-"}</TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate" title={o.title}>
                            {o.title}
                          </TableCell>
                          <TableCell>${Number(o.payout || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{o.countries || "-"}</TableCell>
                          <TableCell>{o.platform || "-"}</TableCell>
                          <TableCell>{o.device || "-"}</TableCell>
                          <TableCell>{o.vertical || "-"}</TableCell>
                          <TableCell>{o.category || "-"}</TableCell>
                          <TableCell>
                            {o.tracking_url ? (
                              <div className="flex items-center gap-1">
                                <a 
                                  href={o.tracking_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-500 hover:underline truncate max-w-[150px]"
                                  title={o.tracking_url}
                                >
                                  {o.tracking_url.substring(0, 20)}...
                                </a>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                  onClick={() => generateTrackingUrl(o)}
                                  disabled={generatingTrackingUrl && generatingForOffer === o.id}
                                  title="Regenerate Tracking URL"
                                >
                                  <RefreshCw className={`h-3 w-3 ${generatingTrackingUrl && generatingForOffer === o.id ? 'animate-spin' : ''}`} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => generateTrackingUrl(o)}
                                disabled={!o.offer_id || (generatingTrackingUrl && generatingForOffer === o.id)}
                                title={!o.offer_id ? "Offer ID required first" : "Generate Tracking URL"}
                              >
                                {generatingTrackingUrl && generatingForOffer === o.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Link2 className="h-3 w-3 mr-1" />
                                )}
                                {!o.offer_id ? "Need ID" : "Generate"}
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{o.percent || 0}%</Badge>
                          </TableCell>
                          <TableCell>
                            {o.expiry_date ? new Date(o.expiry_date).toLocaleDateString() : "No expiry"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={o.status === "active" ? "default" : "secondary"}>
                              {o.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => viewOfferDetails(o)}
                                title="View Details"
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => copyOfferDetailsToClipboard(o)}
                                title="Copy details to clipboard"
                              >
                                <Clipboard className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openEdit(o)} 
                                title="Edit"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-green-500 hover:bg-green-600 text-white" 
                                onClick={() => handleExtraBoostSingle(o)} 
                                title="Extra Boost"
                              >
                                <Zap className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white" 
                                onClick={() => handlePauseBoostSingle(o)} 
                                title="Pause Boost"
                              >
                                <Zap className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={() => handleDeleteBoostSingle(o)} 
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Duplicate Detection</h2>
                <p className="text-sm text-muted-foreground">Find and manage duplicate offers in your database</p>
              </div>
              <Button onClick={loadDuplicateGroups} variant="outline" disabled={loadingDuplicates}>
                {loadingDuplicates ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </div>

            {loadingDuplicates ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                  Loading duplicate groups...
                </CardContent>
              </Card>
            ) : duplicateGroups.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No duplicate offers found in your database!
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Found <strong>{duplicateGroups.length}</strong> duplicate group(s). 
                    These offers have matching: <strong>offer_id, title, device, countries, and payout</strong>.
                  </p>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {duplicateGroups.map((group, index) => (
                    <Card key={index} className="border-yellow-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="bg-yellow-50">
                            Group #{index + 1}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {group.offers.length} duplicate(s)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div><span className="font-medium">Offer ID:</span> {group.offer_id}</div>
                          <div><span className="font-medium">Title:</span> {group.title}</div>
                          <div><span className="font-medium">Device:</span> {group.device}</div>
                          <div><span className="font-medium">Countries:</span> {group.countries}</div>
                          <div><span className="font-medium">Payout:</span> ${group.payout}</div>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Offers in this group:</p>
                          <div className="space-y-2">
                            {group.offers.map((offer: any, offerIndex: number) => (
                              <div key={offer.id} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                                <div>
                                  <span className="font-medium">{offer.title}</span>
                                  <span className="text-muted-foreground ml-2">(ID: {offer.offer_id})</span>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => viewOfferDetails(offer)}>
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => openEdit(offer)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => moveToRecycleBin(offer.id, offer)} disabled={deletingOffer === offer.id}>
                                    {deletingOffer === offer.id ? (
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Bulk Upload Tab */}
        <TabsContent value="bulk" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Bulk Offer Upload</h2>
                <p className="text-sm text-muted-foreground">Upload CSV file or import from Google Sheets.</p>
              </div>
              <div className="flex gap-2">
                <Select value={bulkUploadStatus} onValueChange={setBulkUploadStatus}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Upload Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="boosted">Boosted</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => downloadTemplate()}>
                  <Download className="h-4 w-4 mr-2" /> Download Template
                </Button>
              </div>
            </div>
            
            {/* Google Sheets Import */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Import from Google Sheets</h3>
                <div className="flex gap-2">
                  <Input 
                    value={googleSheetUrl} 
                    onChange={(e) => setGoogleSheetUrl(e.target.value)} 
                    placeholder="Paste Google Sheets URL here..."
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => handleGoogleSheetImport(googleSheetUrl)} 
                    disabled={processingBulkImport || !googleSheetUrl}
                  >
                    {processingBulkImport ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Import
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Make sure your Google Sheet is published to the web (File → Share → Publish to web)
                </p>
              </CardContent>
            </Card>

            {/* CSV Import */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload CSV File</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-medium">
                    Supported: offer_id, title, url, country, payout, platform, device, vertical, category, etc.
                  </p>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <label className="cursor-pointer">
                    <input 
                      type="file" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={handleBulkCsvUpload} 
                      disabled={processingBulkImport} 
                    />
                    <div className="text-center">
                      <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">Drop CSV or click to upload</p>
                    </div>
                  </label>
                </div>
                {bulkImportPreview.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="skip-duplicates" 
                        checked={skipDuplicates} 
                        onCheckedChange={(checked) => setSkipDuplicates(!!checked)} 
                      />
                      <label htmlFor="skip-duplicates">Skip Duplicates ({duplicateMatches.size})</label>
                    </div>
                    <Button onClick={processBulkImport} disabled={bulkUploading} className="w-full">
                      {bulkUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Import {bulkImportPreview.length} Offers
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Missing Offers Tab */}
        <TabsContent value="missing" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Check Missing Offers</h2>
                <p className="text-sm text-muted-foreground">Upload CSV to find missing offers</p>
              </div>
              <Button onClick={handleCheckMissingOffers} disabled={processingBulkImport}>
                <BarChart3 className="h-4 w-4 mr-2" /> Generate Report
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Recycle Bin Tab */}
        <TabsContent value="recycle" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Recycle Bin</h2>
                <p className="text-sm text-muted-foreground">Deleted offers kept for 30 days</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    console.log('🔄 Manual refresh triggered for Recycle Bin');
                    loadRecycleBin();
                  }}
                  variant="outline"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh Recycle Bin
                </Button>
                {selectedRecycleBin.size > 0 && (
                  <Button
                    onClick={handleMultipleRestore}
                    variant="outline"
                    disabled={restoringRecycleBin}
                  >
                    {restoringRecycleBin ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Restore ({selectedRecycleBin.size})
                  </Button>
                )}
                {selectedRecycleBin.size > 0 && (
                  <Button
                    onClick={handleMultiplePermanentDelete}
                    variant="destructive"
                    disabled={deletingRecycleBin}
                  >
                    {deletingRecycleBin ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {deletingRecycleBin
                      ? `Deleting ${deletingCount} of ${deletingTotal}...`
                      : `Delete (${selectedRecycleBin.size})`
                    }
                  </Button>
                )}
              </div>
            </div>
            {recycleBinItems.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Recycle bin is empty
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">
                          <Checkbox
                            checked={selectedRecycleBin.size === recycleBinItems.length && recycleBinItems.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedRecycleBin(new Set(recycleBinItems.map((item) => item.id)));
                              else setSelectedRecycleBin(new Set());
                            }}
                          />
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Offer ID</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recycleBinItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecycleBin.has(item.id)}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedRecycleBin);
                                if (checked) newSelected.add(item.id);
                                else newSelected.delete(item.id);
                                setSelectedRecycleBin(newSelected);
                              }}
                            />
                          </TableCell>
                          <TableCell>{item.offer_data?.title || "Unknown"}</TableCell>
                          <TableCell className="text-sm font-mono text-blue-600">
                            {item.offer_data?.offer_id || "-"}
                          </TableCell>
                          <TableCell>{new Date(item.deleted_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge>{calculateRemainingDays(item.deleted_at)} days</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  await restoreFromRecycleBin(item.id, item.offer_id);
                                  toast({ title: "Restored" });
                                  loadRecycleBin();
                                  load();
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" /> Restore
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={async () => {
                                  await permanentlyDeleteFromRecycleBin(item.id);
                                  toast({ title: "Permanently Deleted" });
                                  loadRecycleBin();
                                }}
                              >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Single Offer View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offer Details</DialogTitle>
          </DialogHeader>
          {viewingOffer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Offer ID</h3>
                  <p className="text-lg font-semibold text-blue-600">{viewingOffer.offer_id || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Network ID</h3>
                  <p className="text-lg">{viewingOffer.network_id || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Title</h3>
                  <p className="text-lg font-semibold">{viewingOffer.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge variant={viewingOffer.status === "active" ? "default" : "secondary"}>
                    {viewingOffer.status}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">URL</h3>
                <a href={viewingOffer.url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-500 hover:underline break-all">
                  {viewingOffer.url}
                </a>
              </div>

              {viewingOffer.preview_url && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Preview URL</h3>
                  <a href={viewingOffer.preview_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-500 hover:underline break-all">
                    {viewingOffer.preview_url}
                  </a>
                </div>
              )}

              {viewingOffer.tracking_url && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Tracking URL</h3>
                  <a href={viewingOffer.tracking_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-500 hover:underline break-all">
                    {viewingOffer.tracking_url}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    Generated for Offer ID: {viewingOffer.offer_id}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Payout</h3>
                  <p className="text-lg">${Number(viewingOffer.payout || 0).toFixed(2)} {viewingOffer.currency}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Payout Model</h3>
                  <p className="text-lg">{viewingOffer.payout_model || "CPA"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Percent</h3>
                  <p className="text-lg">{viewingOffer.percent || 0}%</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Countries</h3>
                  <p className="text-lg">{viewingOffer.countries || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Platform</h3>
                  <p className="text-lg">{viewingOffer.platform || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Device</h3>
                  <p className="text-lg">{viewingOffer.device || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Category</h3>
                  <p className="text-lg">{viewingOffer.category || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Vertical</h3>
                  <p className="text-lg">{viewingOffer.vertical || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Traffic Sources</h3>
                  <p className="text-lg">
                    {viewingOffer.traffic_sources ? 
                      (Array.isArray(viewingOffer.traffic_sources) ? 
                        viewingOffer.traffic_sources.join(", ") : 
                        viewingOffer.traffic_sources
                      ) : "-"
                    }
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-sm whitespace-pre-wrap">{viewingOffer.description || "-"}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Created At</h3>
                  <p className="text-lg">
                    {viewingOffer.created_at ? new Date(viewingOffer.created_at).toLocaleString() : "-"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Last Updated</h3>
                  <p className="text-lg">
                    {viewingOffer.updated_at ? new Date(viewingOffer.updated_at).toLocaleString() : "-"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Expiry Date</h3>
                  <p className="text-lg">
                    {viewingOffer.expiry_date ? new Date(viewingOffer.expiry_date).toLocaleString() : "-"}
                  </p>
                </div>
              </div>

              {viewingOffer.image_url && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Image</h3>
                  <img src={viewingOffer.image_url} alt={viewingOffer.title} className="max-h-48 rounded-lg" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk View Dialog */}
      <Dialog open={bulkViewDialogOpen} onOpenChange={setBulkViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Offer Details ({bulkViewOffers.length} offers)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {bulkViewOffers.map((offer, index) => (
              <Card key={offer.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold">{index + 1}. {offer.title}</h3>
                    <Badge variant={offer.status === "active" ? "default" : "secondary"}>
                      {offer.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Offer ID:</span>{' '}
                      <span className="font-mono text-blue-600">{offer.offer_id || "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Network ID:</span> {offer.network_id || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payout:</span> ${Number(offer.payout || 0).toFixed(2)} {offer.currency}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Countries:</span> {offer.countries || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Platform:</span> {offer.platform || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Device:</span> {offer.device || "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span> {offer.created_at ? new Date(offer.created_at).toLocaleDateString() : "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span> {offer.updated_at ? new Date(offer.updated_at).toLocaleDateString() : "-"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expiry:</span> {offer.expiry_date ? new Date(offer.expiry_date).toLocaleDateString() : "-"}
                    </div>
                    {offer.tracking_url && (
                      <div className="col-span-3">
                        <span className="text-muted-foreground">Tracking URL:</span>{' '}
                        <a href={offer.tracking_url} target="_blank" rel="noopener noreferrer" 
                           className="text-blue-500 hover:underline text-xs">
                          {offer.tracking_url}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Multiple Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicate Selected Offers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create duplicates of {selectedOffers.size} selected offer(s)
            </p>
            <div>
              <label className="text-sm font-medium">Number of copies per offer</label>
              <Select value={String(copyCount)} onValueChange={(v) => setCopyCount(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 copy</SelectItem>
                  <SelectItem value="10">10 copies</SelectItem>
                  <SelectItem value="25">25 copies</SelectItem>
                  <SelectItem value="50">50 copies</SelectItem>
                  <SelectItem value="100">100 copies</SelectItem>
                  <SelectItem value="150">150 copies</SelectItem>
                  <SelectItem value="200">200 copies</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Total offers to be created: {selectedOffers.size * copyCount}. Each copy will have a unique Offer ID (e.g., OFFER_ID_COPY1_123456789)
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancel</Button>
              <Button onClick={copyMultipleOffers} disabled={copying}>
                {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Copy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Boost Dialog */}
      <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Boost Selected Offers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply extra percentage to {selectedOffers.size} selected offers until expiry date.
            </p>
            <div>
              <label className="text-sm font-medium">Boost Percentage</label>
              <Select value={String(boostPercent)} onValueChange={(v) => setBoostPercent(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date</label>
              <Input 
                type="date" 
                value={boostDate} 
                onChange={(e) => setBoostDate(e.target.value)} 
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBoostDialog(false)}>Cancel</Button>
              <Button onClick={handleBoostOffers} disabled={boosting}>
                {boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Boost"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extra Boost Dialog */}
      <Dialog open={extraBoostDialog} onOpenChange={setExtraBoostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extra Boost Selected Offers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Apply extra percentage to {selectedBoostedOffers.size} selected boosted offers until expiry date.
            </p>
            <div>
              <label className="text-sm font-medium">Extra Boost Percentage</label>
              <Select value={String(extraBoostPercent)} onValueChange={(v) => setExtraBoostPercent(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="15">15%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                  <SelectItem value="25">25%</SelectItem>
                  <SelectItem value="30">30%</SelectItem>
                  <SelectItem value="50">50%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Expiry Date</label>
              <Input 
                type="date" 
                value={extraBoostDate} 
                onChange={(e) => setExtraBoostDate(e.target.value)} 
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExtraBoostDialog(false)}>Cancel</Button>
              <Button onClick={handleExtraBoost} disabled={extraBoosting}>
                {extraBoosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Extra Boost"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Offer Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Offer" : "Add New Offer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Offer ID *</label>
                <Input 
                  value={form.offer_id} 
                  onChange={(e) => setForm({ ...form, offer_id: e.target.value })} 
                  placeholder="UNIQUE_OFFER_123" 
                  className={!form.offer_id ? "border-red-300" : ""}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be unique - used for tracking URL generation
                </p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input 
                  value={form.title} 
                  onChange={(e) => handleTitleOrDescriptionChange('title', e.target.value)} 
                  placeholder="Offer title" 
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL *</label>
              <Input 
                value={form.url} 
                onChange={(e) => setForm({ ...form, url: e.target.value })} 
                placeholder="https://..." 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tracking URL</label>
              <div className="flex gap-2">
                <Input 
                  value={form.tracking_url} 
                  onChange={(e) => setForm({ ...form, tracking_url: e.target.value })} 
                  placeholder="https://tracking.example.com/..." 
                  className="flex-1"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (form.title && form.url && form.offer_id) {
                      const trackingUrl = await generateTrackingUrl(form);
                      if (trackingUrl) {
                        setForm({ ...form, tracking_url: trackingUrl });
                      }
                    } else {
                      toast({ 
                        title: "Missing Required Fields", 
                        description: "Title, URL, and Offer ID are required to generate tracking URL",
                        variant: "destructive" 
                      });
                    }
                  }}
                  disabled={!form.offer_id}
                  title={!form.offer_id ? "Offer ID required first" : "Generate Tracking URL"}
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Will be generated using Offer ID: {form.offer_id || "(not set)"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Payout</label>
                <Input 
                  type="number" 
                  value={form.payout} 
                  onChange={(e) => setForm({ ...form, payout: Number(e.target.value) })} 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Payout Model</label>
                <Select value={form.payout_model} onValueChange={(v) => setForm({ ...form, payout_model: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPA">CPA</SelectItem>
                    <SelectItem value="CPL">CPL</SelectItem>
                    <SelectItem value="CPI">CPI</SelectItem>
                    <SelectItem value="CPS">CPS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Countries</label>
                <Input 
                  value={form.countries} 
                  onChange={(e) => setForm({ ...form, countries: e.target.value })} 
                  placeholder="US, UK, CA" 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Platform</label>
                <Input 
                  value={form.platform} 
                  onChange={(e) => setForm({ ...form, platform: e.target.value })} 
                  placeholder="web, ios, android" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Device</label>
                <Input 
                  value={form.device} 
                  onChange={(e) => setForm({ ...form, device: e.target.value })} 
                  placeholder="mobile, desktop" 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Input 
                  value={form.category} 
                  onChange={(e) => setForm({ ...form, category: e.target.value })} 
                  placeholder="GENERAL" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Expiry Date</label>
                <Input 
                  type="date" 
                  value={form.expiry_date} 
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} 
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Percent</label>
                <Input 
                  type="number" 
                  value={form.percent} 
                  onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} 
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Image</label>
              <div className="flex gap-2">
                <Input 
                  value={form.image_url} 
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })} 
                  placeholder="https://..." 
                  className="flex-1" 
                />
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                  />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <span>
                      {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Traffic Sources</label>
              <Input 
                value={form.traffic_sources} 
                onChange={(e) => setForm({ ...form, traffic_sources: e.target.value })} 
                placeholder="Social, Email" 
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea 
                value={form.description} 
                onChange={(e) => handleTitleOrDescriptionChange('description', e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch 
                  checked={form.status === "active"} 
                  onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} 
                />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={form.is_public !== false} 
                  onCheckedChange={(v) => setForm({ ...form, is_public: v })} 
                />
                <span className="text-sm">Public</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={!form.offer_id}>
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Offers Dialog */}
      <Dialog open={duplicateOffersDialogOpen} onOpenChange={setDuplicateOffersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Duplicate Offers Found ({duplicateOffers.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                The following offers match existing offers in the database. All 5 fields matched:
                <span className="font-bold text-red-600"> offer_id, title, device, countries, and payout</span>.
              </p>
            </div>

            {/* Upload Summary */}
            {uploadSummary && (
              <div className="grid grid-cols-4 gap-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{uploadSummary.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{uploadSummary.valid}</p>
                    <p className="text-xs text-muted-foreground">Valid</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{uploadSummary.duplicates}</p>
                    <p className="text-xs text-muted-foreground">Duplicates</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{uploadSummary.invalid}</p>
                    <p className="text-xs text-muted-foreground">Invalid</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Progress Bar */}
            {bulkUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Delete Progress Bar */}
            {deletingOffer && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Deleting offer...</span>
                  <span>{deleteProgress}%</span>
                </div>
                <Progress value={deleteProgress} className="h-2" />
              </div>
            )}

            {/* Duplicate List */}
            <div className="max-h-[300px] overflow-y-auto space-y-4">
              {duplicateOffers.map((dup, index) => (
                <Card key={index} className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-yellow-50">#{index + 1}</Badge>
                      <span className="font-medium">Duplicate Match</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Uploaded Offer */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-1">
                          <Upload className="h-3 w-3" /> Uploaded Offer
                        </h4>
                        <div className="text-xs space-y-1 bg-blue-50 p-2 rounded">
                          <p><span className="font-medium">Offer ID:</span> {dup.uploaded?.offer_id || "-"}</p>
                          <p><span className="font-medium">Title:</span> {dup.uploaded?.title || "-"}</p>
                          <p><span className="font-medium">Device:</span> {dup.uploaded?.device || "-"}</p>
                          <p><span className="font-medium">Countries:</span> {dup.uploaded?.countries || "-"}</p>
                          <p><span className="font-medium">Payout:</span> ${dup.uploaded?.payout || 0}</p>
                        </div>
                      </div>
                      {/* Existing Offer */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-green-600 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Existing Offer
                        </h4>
                        <div className="text-xs space-y-1 bg-green-50 p-2 rounded">
                          <p><span className="font-medium">Offer ID:</span> {dup.existing?.offer_id || "-"}</p>
                          <p><span className="font-medium">Title:</span> {dup.existing?.title || "-"}</p>
                          <p><span className="font-medium">Device:</span> {dup.existing?.device || "-"}</p>
                          <p><span className="font-medium">Countries:</span> {dup.existing?.countries || "-"}</p>
                          <p><span className="font-medium">Payout:</span> ${dup.existing?.payout || 0}</p>
                          <p><span className="font-medium">Date Added:</span> {dup.existing?.created_at ? new Date(dup.existing.created_at).toLocaleDateString() : "-"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setDuplicateOffersDialogOpen(false)}
                disabled={bulkUploading}
              >
                Cancel
              </Button>
              <Button 
                variant="outline" 
                onClick={handleRemoveDuplicates}
                disabled={bulkUploading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Remove Duplicates
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSkipDuplicates}
                disabled={bulkUploading}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Duplicates
              </Button>
              <Button 
                onClick={handleUploadAnyway}
                disabled={bulkUploading}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {bulkUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOffers;
