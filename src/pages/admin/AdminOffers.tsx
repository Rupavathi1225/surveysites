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
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Loader2, Trash, FileUp, Eye, BarChart3, Download, Zap, Filter, CheckCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { checkBatchDuplicates, logDuplicateDetection } from "@/lib/duplicateDetection";
import { detectMissingOffers, saveMissingOffersReport, getMissingOffersReports, deleteMissingOffersReport } from "@/lib/missingOffersDetection";
import { moveMultipleToRecycleBin, getRecycleBinItems, restoreFromRecycleBin, permanentlyDeleteFromRecycleBin, calculateRemainingDays } from "@/lib/recycleBin";

interface OfferData {
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
  status: "active",
  approval_status: "pending", 
  approved_date: null, 
  approved_by: null, 
  rejection_reason: "", 
  created_at: null, 
  updated_at: null
};

const AdminOffers = () => {
  const [items, setItems] = useState<any[]>([]);
  // ... rest of the code remains the same ...
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

  // Filter states for offers
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [networks, setNetworks] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOffers, setTotalOffers] = useState(0);

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

  // Get unique filter values from offers
  const categories = [...new Set(items.map(o => o.category).filter(Boolean))];
  const devices = [...new Set(items.map(o => o.device || o.devices).filter(Boolean))];
  const countries = [...new Set(items.flatMap(o => (o.countries || "").split(",").map((c: string) => c.trim())).filter(Boolean))];

  // Filter offers based on selected filters
  const filteredItems = items.filter(o => {
    if (categoryFilter !== "all" && o.category !== categoryFilter) return false;
    if (deviceFilter !== "all" && o.device !== deviceFilter && o.devices !== deviceFilter) return false;
    if (countryFilter !== "all" && o.countries && !o.countries.toLowerCase().includes(countryFilter.toLowerCase())) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (networkFilter !== "all" && o.network_id !== networkFilter) return false;
    return true;
  });

  // Pagination logic
  const itemsPerPage = 30;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Load boosted offers
  const loadBoostedOffers = async () => {
    try {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .or("percent.gt.0,expiry_date.not.is.null")
        .eq("is_deleted", false)
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
    loadRecycleBin();
    loadMissingOffersReports();
    loadBoostedOffers();
  }, []);

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
            expiry_date: extraBoostDate 
          })
          .eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ title: `Extra Boost Applied!`, description: `${successCount} offers boosted with ${extraBoostPercent}% extra until ${extraBoostDate}` });
      setExtraBoostDialog(false);
      setSelectedBoostedOffers(new Set());
      loadBoostedOffers();
    } catch (error) {
      toast({ title: `Extra boost failed`, description: String(error), variant: "destructive" });
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
            expiry_date: null 
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
      toast({ title: `Deleted!`, description: `Successfully deleted ${successCount} boosted offer${successCount !== 1 ? 's' : ''}` });
      setSelectedBoostedOffers(new Set());
      loadBoostedOffers();
      load();
      loadRecycleBin();
    } catch (error) {
      toast({ title: `Delete failed`, description: String(error), variant: "destructive" });
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

  // Handle boost offers - apply percentage and expiry date to selected offers
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
        const { error } = await supabase.from("offers").update({ percent: boostPercent, expiry_date: boostDate }).eq("id", offerId);
        if (!error) successCount++;
      }
      toast({ title: "Boost Applied!", description: `${successCount} offers boosted with ${boostPercent}% extra until ${boostDate}` });
      setShowBoostDialog(false);
      setSelectedOffers(new Set());
      load();
    } catch (error) {
      toast({ title: "Boost failed", description: String(error), variant: "destructive" });
    } finally {
      setBoosting(false);
    }
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
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("survey-provider-images").getPublicUrl(path);
    setForm((f: any) => ({ ...f, image_url: publicUrl }));
    setUploading(false);
    toast({ title: "Image uploaded!" });
  };

  const load = () => {
    supabase.from("offers").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));
  };

  const loadRecycleBin = async () => {
    const items = await getRecycleBinItems();
    setRecycleBinItems(items);
  };

  const loadMissingOffersReports = async () => {
    const reports = await getMissingOffersReports();
    setMissingOffersReports(reports);
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

      let processedData = sheetData.map((offer: any) => {
        const withDefaults = {
          ...offer,
          payout: offer.payout ? Number(offer.payout) : 0,
          currency: offer.currency || "USD",
          payout_model: offer.payout_model || "CPA",
          status: "active",
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
          description: `Found ${processedData.length} offers. ${duplicates.size} duplicates detected - these offers are already loaded, duplicate offers are not allowed.`,
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

      let processedData = csvData.map((offer) => {
        const withDefaults = {
          ...offer,
          payout: offer.payout ? Number(offer.payout) : 0,
          currency: offer.currency || "USD",
          payout_model: offer.payout_model || "CPA",
          status: "active",
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
      toast({ title: "CSV Parsed Successfully", description: `Found ${processedData.length} offers. ${duplicates.size} duplicates detected.` });
    } catch (error) {
      console.error("Error parsing CSV:", error);
      toast({ title: "CSV Parse Error", description: String(error), variant: "destructive" });
    } finally {
      setProcessingBulkImport(false);
    }
  };

  const processBulkImport = async () => {
    if (bulkImportPreview.length === 0) return;

    setBulkUploading(true);
    const batchId = crypto.randomUUID();
    let successCount = 0, failCount = 0, skippedCount = 0;

    try {
      for (let i = 0; i < bulkImportPreview.length; i++) {
        const offer = bulkImportPreview[i];

        if (skipDuplicates && offer.isDuplicate) {
          skippedCount++;
          await logDuplicateDetection(batchId, offer.title, offer.duplicateMatch?.existingOfferId || null, offer.duplicateMatch?.matchingFields || [], "skipped");
          continue;
        }

        const validation = validateOfferData(offer);
        if (!validation.valid) { failCount++; continue; }

        const offerData = {
          offer_id: offer.offer_id || null, title: offer.title, url: offer.url, payout: offer.payout || 0,
          currency: offer.currency || "USD", payout_model: offer.payout_model || "CPA", description: offer.description || null,
          countries: offer.countries || null, platform: offer.platform || null, device: offer.device || null,
          preview_url: offer.preview_url || null, image_url: offer.image_url || null, traffic_sources: offer.traffic_sources || null,
          vertical: offer.vertical || null, category: offer.category || null, devices: offer.devices || null,
          expiry_date: offer.expiry_date || null, non_access_url: offer.non_access_url || null, percent: offer.percent || 0, status: "active",
        };

        const { error } = await supabase.from("offers").insert(offerData);
        if (error) { failCount++; } else { successCount++; }
      }

      toast({ title: "Bulk Import Complete", description: `Successfully imported: ${successCount}, Failed: ${failCount}, Skipped: ${skippedCount}` });
      setBulkImportPreview([]); setShowBulkPreview(false); setDuplicateMatches(new Map()); load();
    } catch (error) {
      console.error("Error processing bulk import:", error);
      toast({ title: "Bulk Import Error", description: String(error), variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  };

  const handleMultipleDelete = async () => {
    if (selectedOffers.size === 0) { toast({ title: "No offers selected", variant: "destructive" }); return; }

    const offerMap = new Map<string, any>();
    selectedOffers.forEach((id) => { const offer = items.find((o) => o.id === id); if (offer) offerMap.set(id, offer); });

    const result = await moveMultipleToRecycleBin(Array.from(selectedOffers), offerMap);
    toast({ title: "Offers Deleted", description: `Successfully deleted ${result.successful} offer${result.successful !== 1 ? 's' : ''}` });
    setSelectedOffers(new Set()); load(); loadRecycleBin();
  };

  const handleCheckMissingOffers = async () => {
    const file = document.createElement("input"); file.type = "file"; file.accept = ".csv";
    file.onchange = async (e: any) => {
      setProcessingBulkImport(true);
      try {
        const csvData = await parseCSV(e.target.files[0]);
        const result = await detectMissingOffers(csvData);
        await saveMissingOffersReport(crypto.randomUUID(), `Missing Offers Report - ${new Date().toLocaleString()}`, csvData, result.missingOffers, ["name", "payout", "country", "platform"]);
        loadMissingOffersReports();
        toast({ title: "Report Generated", description: `Found ${result.missingOffers.length} missing offers out of ${result.totalUploaded}` });
      } catch (error) { toast({ title: "Error", description: String(error), variant: "destructive" }); }
      finally { setProcessingBulkImport(false); }
    };
    file.click();
  };

  useEffect(() => {
    load();
    loadRecycleBin();
    loadMissingOffersReports();
    loadBoostedOffers();
    fetchNetworks();
    
    // Listen for offers imported event from ApiImport component
    const handleOffersImported = () => {
      load(); // Refresh offers when import is complete
      loadBoostedOffers(); // Also refresh boosted offers
      fetchNetworks(); // Also refresh networks
    };
    
    window.addEventListener('offers-imported', handleOffersImported);
    
    return () => {
      window.removeEventListener('offers-imported', handleOffersImported);
    };
  }, []);

  // Update total offers when items change
  useEffect(() => {
    setTotalOffers(items.length);
  }, [items]);

  const openAdd = () => { setForm(defaultForm); setEditing(null); setOpen(true); };
  const openEdit = (item: any) => { setForm({ ...item, expiry_date: item.expiry_date ? new Date(item.expiry_date).toISOString().split("T")[0] : "" }); setEditing(item.id); setOpen(true); };

  const save = async () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    
    let finalForm = { ...form };
    if (!finalForm.traffic_sources && finalForm.title) finalForm.traffic_sources = generateTrafficSource(finalForm.platform, finalForm.title);
    if (!finalForm.vertical && finalForm.title) finalForm.vertical = detectVertical(finalForm.title, finalForm.description);
    if (!finalForm.category && finalForm.title) finalForm.category = detectCategory(finalForm.title, finalForm.description);
    
    const payload = { ...finalForm, expiry_date: finalForm.expiry_date || null };
    
    if (editing) {
      await supabase.from("offers").update(payload).eq("id", editing);
      toast({ title: "Offer updated!" });
    } else {
      await supabase.from("offers").insert(payload);
      toast({ title: "Offer created!" });
    }
    setOpen(false); load();
  };

  const del = async (id: string) => { await supabase.from("offers").delete().eq("id", id); toast({ title: "Offer deleted" }); load(); };
  const toggleStatus = async (id: string, current: string) => { await supabase.from("offers").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id); load(); };

  const moveToRecycleBin = async (id: string, offerData: any) => {
    try {
      await supabase.from("recycle_bin").insert({ offer_id: id, offer_data: offerData, deleted_at: new Date().toISOString() });
      await supabase.from("offers").update({ is_deleted: true, deleted_at: new Date().toISOString() }).eq("id", id);
    } catch (error) { console.log("Recycle bin not available, doing permanent delete"); await supabase.from("offers").delete().eq("id", id); }
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
          rejection_reason: ""
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
          description: `${offer.title} has been approved successfully` 
        });
        load(); // Refresh offers to show updated status
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: String(error), 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="active">Active Offers</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Offers</TabsTrigger>
          <TabsTrigger value="boosted">Boosted Offers</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="missing">Missing Offers</TabsTrigger>
          <TabsTrigger value="recycle">Recycle Bin</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="space-y-6">
          <div className="flex items-center justify-between">
            <div><h1 className="text-2xl font-bold">Offers Management</h1><p className="text-sm text-muted-foreground">Manage offers</p></div>
            <div className="flex gap-2">
              <Button onClick={openAdd} variant="default"><Plus className="h-4 w-4 mr-2" /> Add Offer</Button>
              {selectedOffers.size > 0 && (
                <>
                  <Button onClick={() => setShowBoostDialog(true)} variant="outline" className="bg-yellow-500 hover:bg-yellow-600 text-white"><Zap className="h-4 w-4 mr-2" /> Boost ({selectedOffers.size})</Button>
                  <Button onClick={handleMultipleDelete} variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedOffers.size})</Button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={deviceFilter} onValueChange={setDeviceFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Device" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Devices</SelectItem>{devices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Network" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Networks</SelectItem>{networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><Checkbox checked={selectedOffers.size === filteredItems.length && filteredItems.length > 0} onCheckedChange={(checked) => { if (checked) setSelectedOffers(new Set(filteredItems.map((o) => o.id))); else setSelectedOffers(new Set()); }} /></TableHead>
                    <TableHead>Offer ID</TableHead><TableHead>Network ID</TableHead><TableHead>Title</TableHead><TableHead>Preview URL</TableHead><TableHead>Tracking URL</TableHead><TableHead>Payout</TableHead><TableHead>Currency</TableHead><TableHead>Payout Model</TableHead><TableHead>Countries</TableHead><TableHead>Platform</TableHead><TableHead>Device</TableHead><TableHead>Vertical</TableHead><TableHead>Category</TableHead><TableHead>Approved Date</TableHead><TableHead>Approved By</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow><TableCell colSpan={16} className="text-center text-muted-foreground py-8">No offers found</TableCell></TableRow>
                  ) : (
                    paginatedItems.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell><Checkbox checked={selectedOffers.has(o.id)} onCheckedChange={(checked) => { const newSelected = new Set(selectedOffers); if (checked) newSelected.add(o.id); else newSelected.delete(o.id); setSelectedOffers(newSelected); }} /></TableCell>
                        <TableCell className="text-sm font-mono">{o.offer_id || "-"}</TableCell>
                        <TableCell className="text-sm font-mono">{o.network_id || "-"}</TableCell>
                        <TableCell className="font-medium">{o.title}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">{o.preview_url || o.url || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">{o.tracking_url || "-"}</TableCell>
                        <TableCell>${Number(o.payout || 0).toFixed(2)}</TableCell>
                        <TableCell>{o.currency || "USD"}</TableCell>
                        <TableCell>{o.payout_model || "CPA"}</TableCell>
                        <TableCell className="text-xs">{o.countries || "-"}</TableCell>
                        <TableCell>{o.platform || "-"}</TableCell>
                        <TableCell>{o.device || "-"}</TableCell>
                        <TableCell>{o.vertical || "-"}</TableCell>
                        <TableCell>{o.category || "-"}</TableCell>
                        <TableCell className="text-xs">{o.approved_date ? new Date(o.approved_date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell className="text-xs">{o.approved_by || "-"}</TableCell>
                        <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Switch checked={o.status === "active"} onCheckedChange={() => toggleStatus(o.id, o.status)} />
                            <Button size="sm" variant="outline" onClick={() => openEdit(o)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={async () => { await moveToRecycleBin(o.id, o); toast({ title: "Offer moved to recycle bin" }); load(); loadRecycleBin(); }}><Trash2 className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => approveOffer(o)} title="Approve">
                              <CheckCircle className="h-3 w-3" />
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
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} offers
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="min-w-[32px]"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="boosted" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold">Boosted Offers</h2><p className="text-sm text-muted-foreground">Manage offers with boost percentages</p></div>
              {selectedBoostedOffers.size > 0 && (
                <div className="flex gap-2">
                  <Button onClick={() => setExtraBoostDialog(true)} variant="outline" className="bg-green-500 hover:bg-green-600 text-white">
                    <Zap className="h-4 w-4 mr-2" /> Extra Boost ({selectedBoostedOffers.size})
                  </Button>
                  <Button onClick={handlePauseBoostedOffers} variant="outline" className="bg-yellow-500 hover:bg-yellow-600 text-white">
                    <Zap className="h-4 w-4 mr-2" /> Pause ({selectedBoostedOffers.size})
                  </Button>
                  <Button onClick={handleDeleteBoostedOffers} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedBoostedOffers.size})
                  </Button>
                </div>
              )}
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox 
                          checked={selectedBoostedOffers.size === boostedOffers.length && boostedOffers.length > 0} 
                          onCheckedChange={(checked) => { 
                            if (checked) setSelectedBoostedOffers(new Set(boostedOffers.map((o) => o.id))); 
                            else setSelectedBoostedOffers(new Set()); 
                          }} 
                        />
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Boost %</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boostedOffers.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No boosted offers found</TableCell></TableRow>
                    ) : (
                      boostedOffers.map((o) => (
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
                          <TableCell className="font-medium">{o.title}</TableCell>
                          <TableCell><Badge variant="secondary">{o.percent || 0}%</Badge></TableCell>
                          <TableCell>{o.expiry_date || o.boost_expiry_date ? new Date(o.expiry_date || o.boost_expiry_date).toLocaleDateString() : "No expiry"}</TableCell>
                          <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => openEdit(o)} title="Edit">
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleExtraBoostSingle(o)} title="Extra Boost">
                                <Zap className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={() => handlePauseBoostSingle(o)} title="Pause Boost">
                                <Zap className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteBoostSingle(o)} title="Delete">
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

        <TabsContent value="duplicates" className="space-y-6">
          <div className="space-y-4">
            <div><h2 className="text-2xl font-bold">Duplicate Detection</h2><p className="text-sm text-muted-foreground">Find and manage duplicate offers</p></div>
            <Card><CardContent className="p-6 text-center text-muted-foreground">Duplicate detection feature coming soon</CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold mb-2">Bulk Offer Upload</h2><p className="text-sm text-muted-foreground">Upload CSV file or import from Google Sheets.</p></div>
              <Button variant="outline" onClick={() => downloadTemplate()}><Download className="h-4 w-4 mr-2" /> Download Template</Button>
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
                <p className="text-xs text-muted-foreground mt-2">Make sure your Google Sheet is published to the web (File → Share → Publish to web)</p>
              </CardContent>
            </Card>

            {/* CSV Import */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Upload CSV File</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-medium">Supported: offer_id, title, url, country, payout, platform, device, vertical, category, etc.</p>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <label className="cursor-pointer">
                    <input type="file" accept=".csv" className="hidden" onChange={handleBulkCsvUpload} disabled={processingBulkImport} />
                    <div className="text-center">
                      <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">Drop CSV or click to upload</p>
                    </div>
                  </label>
                </div>
                {bulkImportPreview.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="skip-duplicates" checked={skipDuplicates} onCheckedChange={(checked) => setSkipDuplicates(!!checked)} />
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

        <TabsContent value="missing" className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><h2 className="text-2xl font-bold">Check Missing Offers</h2><p className="text-sm text-muted-foreground">Upload CSV to find missing offers</p></div>
              <Button onClick={handleCheckMissingOffers} disabled={processingBulkImport}><BarChart3 className="h-4 w-4 mr-2" /> Generate Report</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recycle" className="space-y-6">
          <div className="space-y-4">
            <div><h2 className="text-2xl font-bold">Recycle Bin</h2><p className="text-sm text-muted-foreground">Deleted offers kept for 30 days</p></div>
            {recycleBinItems.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">Recycle bin is empty</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Deleted</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recycleBinItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.offer_data?.title || "Unknown"}</TableCell>
                          <TableCell>{new Date(item.deleted_at).toLocaleDateString()}</TableCell>
                          <TableCell><Badge>{calculateRemainingDays(item.deleted_at)} days</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={async () => { await restoreFromRecycleBin(item.id, item.offer_id); toast({ title: "Restored" }); loadRecycleBin(); load(); }}>
                                <Eye className="h-3 w-3 mr-1" /> Restore
                              </Button>
                              <Button size="sm" variant="destructive" onClick={async () => { await permanentlyDeleteFromRecycleBin(item.id); toast({ title: "Permanently Deleted" }); loadRecycleBin(); }}>
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

      <Dialog open={showBoostDialog} onOpenChange={setShowBoostDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Boost Selected Offers</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Apply extra percentage to {selectedOffers.size} selected offers until expiry date.</p>
            <div>
              <label className="text-sm font-medium">Boost Percentage</label>
              <Select value={String(boostPercent)} onValueChange={(v) => setBoostPercent(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input type="date" value={boostDate} onChange={(e) => setBoostDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBoostDialog(false)}>Cancel</Button>
              <Button onClick={handleBoostOffers} disabled={boosting}>{boosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Boost"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={extraBoostDialog} onOpenChange={setExtraBoostDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Extra Boost Selected Offers</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Apply extra percentage to {selectedBoostedOffers.size} selected boosted offers until expiry date.</p>
            <div>
              <label className="text-sm font-medium">Extra Boost Percentage</label>
              <Select value={String(extraBoostPercent)} onValueChange={(v) => setExtraBoostPercent(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Input type="date" value={extraBoostDate} onChange={(e) => setExtraBoostDate(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setExtraBoostDialog(false)}>Cancel</Button>
              <Button onClick={handleExtraBoost} disabled={extraBoosting}>{extraBoosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Extra Boost"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Offer" : "Add New Offer"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Offer ID</label>
                <Input value={form.offer_id} onChange={(e) => setForm({ ...form, offer_id: e.target.value })} placeholder="OFF-001" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title *</label>
                <Input value={form.title} onChange={(e) => handleTitleOrDescriptionChange('title', e.target.value)} placeholder="Offer title" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">URL *</label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Payout</label>
                <Input type="number" value={form.payout} onChange={(e) => setForm({ ...form, payout: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Payout Model</label>
                <Select value={form.payout_model} onValueChange={(v) => setForm({ ...form, payout_model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPA">CPA</SelectItem>
                    <SelectItem value="CPL">CPL</SelectItem>
                    <SelectItem value="CPI">CPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Countries</label>
                <Input value={form.countries} onChange={(e) => setForm({ ...form, countries: e.target.value })} placeholder="US, UK, CA" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Platform</label>
                <Input value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="web, ios, android" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Device</label>
                <Input value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} placeholder="mobile, desktop" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Category</label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="GENERAL" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Expiry Date</label>
                <Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Percent</label>
                <Input type="number" value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Image</label>
              <div className="flex gap-2">
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="flex-1" />
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                    <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
                  </Button>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Traffic Sources</label>
              <Input value={form.traffic_sources} onChange={(e) => setForm({ ...form, traffic_sources: e.target.value })} placeholder="Social, Email" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => handleTitleOrDescriptionChange('description', e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={form.status === "active"} onCheckedChange={(v) => setForm({ ...form, status: v ? "active" : "inactive" })} />
                <span className="text-sm">Active</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_public !== false} onCheckedChange={(v) => setForm({ ...form, is_public: v })} />
                <span className="text-sm">Public</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default AdminOffers;
