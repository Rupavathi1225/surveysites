import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  Download, 
  Loader2, 
  Eye, 
  Trash2,
  Settings,
  Zap,
  AlertCircle,
  Wifi,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { autoFillOfferData } from "@/lib/bulkImportUtils";

interface ApiConfig {
  id: string;
  provider_name: string;
  network_type?: string;
  network_id?: string;
  api_endpoint: string;
  api_key_secret_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface OfferPreview {
  offer_id: string;
  title: string;
  description: string;
  payout: number;
  currency: string;
  countries: string;
  status: string;
}

const ApiImport = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [previewOffers, setPreviewOffers] = useState<OfferPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"success" | "error" | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    provider_name: "",
    network_type: "",
    network_id: "",
    api_endpoint: "",
    api_key: "",
    is_active: true,
  });
  const [importDetailsDialogOpen, setImportDetailsDialogOpen] = useState(false);
  const [importDetails, setImportDetails] = useState<any>(null);

  const isHasOffers = configForm.network_type.toLowerCase().includes("has") ||
    configForm.network_type.toLowerCase().includes("tune") ||
    configForm.network_type.toLowerCase().includes("cpamerchant");

  // Fetch API configurations
  const fetchConfigs = () => {
    supabase
      .from("api_import_configs")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching configs:", error);
          toast({ title: "Error fetching configurations", variant: "destructive" });
        } else {
          setConfigs(data || []);
        }
      });
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Test API connection
  const testConnection = async () => {
    if (!configForm.network_type || !configForm.network_id || !configForm.api_key) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      const provider = configForm.provider_name || configForm.network_type;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token}`,
          },
          body: JSON.stringify({
            provider,
            network_id: configForm.network_id,
            api_key: configForm.api_key,
            action: "test",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Connection test failed");
      }

      toast({ 
        title: "Connection successful", 
        description: `Successfully connected to ${provider} API` 
      });
      setConnectionStatus("success");
    } catch (error: any) {
      console.error("Connection test failed:", error);
      toast({ 
        title: "Connection failed", 
        description: error.message || "Failed to connect to API",
        variant: "destructive" 
      });
      setConnectionStatus("error");
    } finally {
      setTestingConnection(false);
    }
  };

  // Fetch offers preview from API - ONLY uses real API, no mock data
  const fetchPreview = async () => {
    if (!configForm.network_type || !configForm.network_id) {
      toast({ title: "Please fill Network Type and Network ID", variant: "destructive" });
      return;
    }

    setPreviewing(true);
    setPreviewOffers([]);
    
    try {
      const provider = configForm.provider_name || configForm.network_type;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data?.session?.access_token}`,
          },
          body: JSON.stringify({
            provider,
            network_id: configForm.network_id,
            api_key: configForm.api_key,
            action: "preview",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch offers");
      }

      if (data.offers && data.offers.length > 0) {
        setPreviewOffers(data.offers);
        toast({ title: `API Offers Found: ${data.count}` });
      } else {
        toast({
          title: "No offers found",
          description: "The API returned no offers. Check your API credentials.",
        });
      }
    } catch (error: any) {
      console.error("Error fetching offers:", error);
      toast({ 
        title: "Error fetching offers", 
        description: error.message || "Failed to fetch offers from API",
        variant: "destructive" 
      });
    } finally {
      setPreviewing(false);
    }
  };

  // Import all previewed offers to database
  const importOffers = async () => {
    if (previewOffers.length === 0) {
      toast({ title: "No offers to import", description: "Please preview offers first", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const provider = configForm.provider_name || configForm.network_type;
      
      console.log('Starting import with provider:', provider);
      console.log('Preview offers count:', previewOffers.length);
      
      // Check if we're sending all offers
      const offersToSend = previewOffers.map(offer => {
        // Auto-fill missing data before sending to database
        try {
          const filledOffer = autoFillOfferData({
            ...offer,
            provider: provider // Ensure provider is set
          });
          return filledOffer;
        } catch (error) {
          console.error('Error auto-filling offer:', error);
          return offer; // Return original offer if auto-fill fails
        }
      });
      
      console.log('Offers to send count:', offersToSend.length);
      console.log('Sample offer to send:', offersToSend[0]);
      
      const { data: { session } } = await supabase.auth.getSession();

      const requestBody = {
        provider,
        network_id: configForm.network_id,
        api_key: configForm.api_key,
        action: "import",
        offers: offersToSend, // Send all offers to backend
      };
      
      console.log('Sending request with body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      console.log('Raw response from backend:', JSON.stringify(data, null, 2));
      console.log('Response type:', typeof data);
      console.log('Response keys:', Object.keys(data));
      
      console.log('Full backend response:', data);
      console.log('Newly imported count:', data.imported);  // FIXED: Use 'imported' instead of 'newly_imported'
      console.log('Newly imported details length:', data.details?.newly_imported?.length);
      console.log('Duplicate skipped count:', data.duplicate_offers_skipped);
      console.log('Duplicate skipped details length:', data.details?.duplicate_offers_skipped?.length);
      console.log('Failed count:', data.failed_offers);
      console.log('Failed details length:', data.details?.failed_offers?.length);
      console.log('Total API offers:', data.total);
      
      // Check if numbers add up
      const totalAccounted = (data.imported || 0) + (data.duplicate_offers_skipped || 0) + (data.failed_offers || 0);
      console.log(`Total accounted for: ${totalAccounted} (should be ${data.total})`);
      
      if (totalAccounted !== data.total) {
        console.error(`MISMATCH: Expected ${data.total}, got ${totalAccounted}`);
      }

      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        console.error('Response body:', data);
        throw new Error(data.error || `Failed to import offers: ${response.status} ${response.statusText}`);
      }

      // summary toast with detailed breakdown
      const actualImportedCount = data.imported || 0;  // FIXED: Use 'imported' instead of 'newly_imported'
      console.log('Using imported count:', actualImportedCount);
      
      toast({
        title: "Import finished",
        description: `Total API Offers: ${data.total || 0} | New Offers Imported: ${actualImportedCount} | Duplicate Offers Skipped: ${data.duplicate_offers_skipped || 0} | Failed Offers: ${data.failed_offers || 0}`,
        variant: data.failed_offers > 0 ? "destructive" : undefined,
      });

      // Show detailed breakdown dialog
      if (data.details && (actualImportedCount > 0 || data.duplicate_offers_skipped > 0 || data.failed_offers > 0)) {
        setImportDetails(data.details);
        setImportDetailsDialogOpen(true);
      }

      // also log the full debug object for power users
      console.debug("import response:", data);

      // Clear preview after successful import
      setPreviewOffers([]);
      setConfigForm({ provider_name: "", network_type: "", network_id: "", api_endpoint: "", api_key: "", is_active: true });
      
      // Trigger a global refresh event to notify other components
      console.log('🔥 IMPORT DEBUG - About to dispatch offers-imported event with count:', actualImportedCount);
      window.dispatchEvent(new CustomEvent('offers-imported', { detail: { count: actualImportedCount } }));
      console.log('🔥 IMPORT DEBUG - offers-imported event dispatched successfully');
      
      toast({ 
        title: "Import completed successfully", 
        description: `Imported ${actualImportedCount} new offers` 
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({ 
        title: "Import failed", 
        description: error.message || "Failed to import offers",
        variant: "destructive" 
      });
    } finally {
      setImporting(false);
    }
  };

  // Toggle config active status
  const toggleConfig = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("api_import_configs")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating config", variant: "destructive" });
      return;
    }

    fetchConfigs();
  };

  // Delete config
  const deleteConfig = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API configuration?")) {
      return;
    }

    const { error } = await supabase
      .from("api_import_configs")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting config", variant: "destructive" });
      return;
    }

    fetchConfigs();
    toast({ title: "Configuration deleted" });
  };

  // Save config (create or update)
  const saveConfig = async () => {
    if (!configForm.provider_name || !configForm.network_type || !configForm.network_id) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const { error } = editingConfig
      ? await supabase
          .from("api_import_configs")
          .update({
            provider_name: configForm.provider_name,
            network_type: configForm.network_type,
            network_id: configForm.network_id,
            api_endpoint: configForm.api_endpoint,
            is_active: configForm.is_active,
          })
          .eq("id", editingConfig.id)
      : await (supabase.from("api_import_configs") as any)
          .insert({
            provider_name: configForm.provider_name,
            api_endpoint: configForm.api_endpoint,
            api_key_secret_name: configForm.api_key || "",
            is_active: configForm.is_active,
          });

    if (error) {
      toast({ title: "Error updating config", variant: "destructive" });
      return;
    }

    fetchConfigs();
    setConfigDialogOpen(false);
    setEditingConfig(null);
    setConfigForm({ provider_name: "", network_type: "", network_id: "", api_endpoint: "", api_key: "", is_active: true });
  };

  const openAddConfig = () => {
    setEditingConfig(null);
    setConfigForm({ provider_name: "", network_type: "", network_id: "", api_endpoint: "", api_key: "", is_active: true });
    setConfigDialogOpen(true);
  };

  const openEditConfig = (config: ApiConfig) => {
    setEditingConfig(config);
    setConfigForm({
      provider_name: config.provider_name,
      network_type: config.network_type,
      network_id: config.network_id,
      api_endpoint: config.api_endpoint,
      api_key: "",
      is_active: config.is_active,
    });
    setConfigDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Import - Offers</h1>
          <p className="text-sm text-muted-foreground">
            Import offers from external APIs (CPX Research, BitLabs, etc.)
          </p>
        </div>
        <Button variant="outline" onClick={openAddConfig}>
          <Settings className="h-4 w-4 mr-2" />
          Configure API
        </Button>
      </div>

      {/* Instructions Card */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Setup Instructions</h3>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>1. Select your Network Type</li>
                <li>2. Enter your Network ID</li>
                <li>3. Enter your API Key</li>
                <li>3. Click "Test Connection" to verify your API credentials</li>
                <li>4. Click "Preview" to fetch actual offers from API</li>
                <li>5. Click "Import All" to import offers into your database</li>
                <li>ℹ️ Supports: HasOffers, Tune, CPX, BitLabs, or custom networks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Offers
          </CardTitle>
          <CardDescription>
            Enter your network details to fetch and import offers from your API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Network Type</label>
              <Select value={configForm.network_type} onValueChange={(value) => {
                setConfigForm({ ...configForm, network_type: value });
                setConnectionStatus(null);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HasOffers">HasOffers</SelectItem>
                  <SelectItem value="Tune">Tune</SelectItem>
                  <SelectItem value="CPX">CPX Research</SelectItem>
                  <SelectItem value="BitLabs">BitLabs</SelectItem>
                  <SelectItem value="Adscend">Adscend Media</SelectItem>
                  <SelectItem value="PollFish">PollFish</SelectItem>
                  <SelectItem value="Custom">Custom/Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Network ID</label>
              <Input 
                value={configForm.network_id}
                onChange={(e) => {
                  setConfigForm({ ...configForm, network_id: e.target.value });
                  setConnectionStatus(null);
                }}
                placeholder="Enter Network ID"
              />
            </div>
            {!isHasOffers && (
              <div>
                <label className="text-sm font-medium mb-2 block">API Endpoint</label>
                <Input 
                  value={configForm.api_endpoint}
                  onChange={(e) => {
                    setConfigForm({ ...configForm, api_endpoint: e.target.value });
                    setConnectionStatus(null);
                  }}
                  placeholder="https://api.provider.com/v1/offers"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">API Key</label>
              <Input 
                value={configForm.api_key}
                onChange={(e) => {
                  setConfigForm({ ...configForm, api_key: e.target.value });
                  setConnectionStatus(null);
                }}
                placeholder="Enter API Key"
                type="password"
              />
            </div>
          </div>

          {/* Connection Status Indicator */}
          {connectionStatus && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              connectionStatus === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}>
              {connectionStatus === "success" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={connectionStatus === "success" ? "text-green-700" : "text-red-700"}>
                {connectionStatus === "success" ? "Connection successful!" : "Connection failed. Please check your credentials."}
              </span>
            </div>
          )}

          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={testConnection}
              disabled={testingConnection || !configForm.network_type || !configForm.network_id || !configForm.api_key}
            >
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={fetchPreview}
              disabled={previewing || !configForm.network_type || !configForm.network_id || !configForm.api_key}
            >
              {previewing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </>
              )}
            </Button>
            <Button 
              onClick={importOffers}
              disabled={importing || previewOffers.length === 0}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Import {previewOffers.length} Offers
                </>
              )}
            </Button>
          </div>

          {/* Preview Table - Shows ALL offers from API */}
          {previewOffers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Preview ({previewOffers.length} offers from API)
              </h3>
              
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Offer ID</th>
                      <th className="text-left p-3 font-medium">Title</th>
                      <th className="text-left p-3 font-medium">Payout</th>
                      <th className="text-left p-3 font-medium">Countries</th>
                      <th className="text-left p-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewOffers.map((offer, idx) => (
                      <tr key={idx} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-mono text-xs">{offer.offer_id}</td>
                        <td className="p-3 max-w-xs truncate">{offer.title}</td>
                        <td className="p-3">{offer.currency} {offer.payout}</td>
                        <td className="p-3">{offer.countries || "-"}</td>
                        <td className="p-3">
                          <Badge variant={offer.status === "active" ? "default" : "secondary"}>
                            {offer.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurations List */}
      <Card>
        <CardHeader>
          <CardTitle>API Configurations</CardTitle>
          <CardDescription>
            Manage your external API credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No API configurations. Click "Configure API" to add one.
            </p>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <div 
                  key={config.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Switch 
                      checked={config.is_active} 
                      onCheckedChange={() => toggleConfig(config.id, config.is_active)}
                    />
                    <div>
                      <h4 className="font-medium">{config.provider_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Type: <span className="font-mono">{config.network_type}</span> | Network ID: <span className="font-mono">{config.network_id}</span>
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {config.api_endpoint}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openEditConfig(config)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteConfig(config.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? "Edit API Configuration" : "Add API Configuration"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Provider Name *</label>
              <Input 
                value={configForm.provider_name}
                onChange={(e) => setConfigForm({ ...configForm, provider_name: e.target.value })}
                placeholder="e.g., CPX Research, HasOffers, BitLabs, Tune, etc."
              />
              <p className="text-xs text-muted-foreground mt-1">Display name for this API configuration</p>
            </div>

            <div>
              <label className="text-sm font-medium">Network Type *</label>
              <Select value={configForm.network_type} onValueChange={(value) => setConfigForm({ ...configForm, network_type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HasOffers">HasOffers</SelectItem>
                  <SelectItem value="Tune">Tune</SelectItem>
                  <SelectItem value="CPX">CPX Research</SelectItem>
                  <SelectItem value="BitLabs">BitLabs</SelectItem>
                  <SelectItem value="Adscend">Adscend Media</SelectItem>
                  <SelectItem value="PollFish">PollFish</SelectItem>
                  <SelectItem value="Custom">Custom/Other</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Type of affiliate network platform</p>
            </div>

            <div>
              <label className="text-sm font-medium">Network ID *</label>
              <Input 
                value={configForm.network_id}
                onChange={(e) => setConfigForm({ ...configForm, network_id: e.target.value })}
                placeholder="e.g., 12345 or cpaerchant"
              />
              <p className="text-xs text-muted-foreground mt-1">Your unique Network ID provided by your manager</p>
            </div>

            <div>
              <label className="text-sm font-medium">API Endpoint *</label>
              <Input 
                value={configForm.api_endpoint}
                onChange={(e) => setConfigForm({ ...configForm, api_endpoint: e.target.value })}
                placeholder="https://api.provider.com/v1/offers"
              />
              <p className="text-xs text-muted-foreground mt-1">The API URL endpoint for fetching offers</p>
            </div>

            <div>
              <label className="text-sm font-medium">API Key *</label>
              <Input 
                value={configForm.api_key}
                onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                placeholder="Enter API Key"
                type="password"
              />
              <p className="text-xs text-muted-foreground mt-1">Your API key for authentication</p>
            </div>

            <div className="flex items-center gap-2">
              <Switch 
                checked={configForm.is_active}
                onCheckedChange={(v) => setConfigForm({ ...configForm, is_active: v })}
              />
              <span className="text-sm">Active</span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveConfig}>
                {editingConfig ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Details Dialog */}
      <ImportDetailsDialog 
        open={importDetailsDialogOpen} 
        onClose={() => setImportDetailsDialogOpen(false)} 
        details={importDetails} 
      />
    </div>
  );
};

// Import Details Dialog Component
const ImportDetailsDialog = ({ open, onClose, details }: { open: boolean; onClose: () => void; details: any }) => {
  if (!details) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Import Results - Detailed Breakdown
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{details.newly_imported?.length || 0}</div>
                <div className="text-sm text-green-600">Newly Imported</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-700">{details.duplicate_offers_skipped?.length || 0}</div>
                <div className="text-sm text-yellow-600">Duplicate Offers Skipped</div>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-700">{details.failed_offers?.length || 0}</div>
                <div className="text-sm text-red-600">Failed Offers</div>
              </CardContent>
            </Card>
          </div>

          {/* Newly Imported Section */}
          {details.newly_imported && details.newly_imported.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Newly Imported Offers ({details.newly_imported.length})
              </h3>
              <div className="space-y-2">
                {details.newly_imported.map((item: any, index: number) => (
                  <Card key={index} className="bg-green-50 border-green-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-green-800">ID: {item.offer_id}</div>
                          <div className="font-medium text-green-800">Title: {item.title}</div>
                        </div>
                        <Badge className="bg-green-600 text-white">Imported</Badge>
                      </div>
                      <div className="text-sm text-green-700 mt-2">{item.reason}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Offers Skipped Section */}
          {details.duplicate_offers_skipped && details.duplicate_offers_skipped.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-yellow-700 mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Duplicate Offers Skipped ({details.duplicate_offers_skipped.length})
              </h3>
              <div className="space-y-2">
                {details.duplicate_offers_skipped.map((item: any, index: number) => (
                  <Card key={index} className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-yellow-800">ID: {item.offer_id}</div>
                          <div className="font-medium text-yellow-800">Title: {item.title}</div>
                        </div>
                        <Badge className="bg-yellow-600 text-white">Duplicate</Badge>
                      </div>
                      <div className="text-sm text-yellow-700 mt-2">{item.reason}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Failed Offers Section */}
          {details.failed_offers && details.failed_offers.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Failed Offers ({details.failed_offers.length})
              </h3>
              <div className="space-y-2">
                {details.failed_offers.map((item: any, index: number) => (
                  <Card key={index} className="bg-red-50 border-red-200">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-red-800">ID: {item.offer_id}</div>
                          <div className="font-medium text-red-800">Title: {item.title}</div>
                        </div>
                        <Badge className="bg-red-600 text-white">Failed</Badge>
                      </div>
                      <div className="text-sm text-red-700 mt-2">
                        <div className="font-medium">Reason:</div> {item.reason}
                        <div className="font-medium mt-1">Error:</div> {item.error}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApiImport;
