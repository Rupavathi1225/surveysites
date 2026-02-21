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
import { Plus, Pencil, Trash2, Upload, Loader2, Trash, FileUp, Eye, BarChart3, Download, Zap, Filter } from "lucide-react";
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

const defaultForm = {
  offer_id: "", title: "", url: "", payout: 0, currency: "USD", payout_model: "CPA",
  countries: "", allowed_countries: "", platform: "", device: "", vertical: "",
  category: "",
  preview_url: "", image_url: "", traffic_sources: "", devices: "",
  expiry_date: "", percent: 0, non_access_url: "", description: "", status: "active"
};

const AdminOffers = () => {
  const [items, setItems] = useState<any[]>([]);
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

  // Boost dialog state
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [boostPercent, setBoostPercent] = useState(10);
  const [boostDate, setBoostDate] = useState("");
  const [boosting, setBoosting] = useState(false);

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
    return true;
  });

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
    toast({ title: "Offers Deleted", description: `Moved to recycle bin: ${result.successful}, Failed: ${result.failed}` });
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

  useEffect(() => { load(); loadRecycleBin(); loadMissingOffersReports(); }, []);

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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="offers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="offers">Offers</TabsTrigger>
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
                    <TableHead>Offer ID</TableHead><TableHead>Title</TableHead><TableHead>URL</TableHead><TableHead>Payout</TableHead><TableHead>Currency</TableHead><TableHead>Payout Model</TableHead><TableHead>Countries</TableHead><TableHead>Platform</TableHead><TableHead>Device</TableHead><TableHead>Vertical</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">No offers found</TableCell></TableRow>
                  ) : (
                    filteredItems.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell><Checkbox checked={selectedOffers.has(o.id)} onCheckedChange={(checked) => { const newSelected = new Set(selectedOffers); if (checked) newSelected.add(o.id); else newSelected.delete(o.id); setSelectedOffers(newSelected); }} /></TableCell>
                        <TableCell className="text-sm font-mono">{o.offer_id || "-"}</TableCell>
                        <TableCell className="font-medium">{o.title}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">{o.url || "-"}</TableCell>
                        <TableCell>${Number(o.payout || 0).toFixed(2)}</TableCell>
                        <TableCell>{o.currency || "USD"}</TableCell>
                        <TableCell>{o.payout_model || "CPA"}</TableCell>
                        <TableCell className="text-xs">{o.countries || "-"}</TableCell>
                        <TableCell>{o.platform || "-"}</TableCell>
                        <TableCell>{o.device || "-"}</TableCell>
                        <TableCell>{o.vertical || "-"}</TableCell>
                        <TableCell>{o.category || "-"}</TableCell>
                        <TableCell><Badge variant={o.status === "active" ? "default" : "secondary"}>{o.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Switch checked={o.status === "active"} onCheckedChange={() => toggleStatus(o.id, o.status)} />
                            <Button size="sm" variant="outline" onClick={() => openEdit(o)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={async () => { await moveToRecycleBin(o.id, o); toast({ title: "Offer moved to recycle bin" }); load(); loadRecycleBin(); }}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
