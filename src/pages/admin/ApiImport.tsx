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
  XCircle
} from "lucide-react";
import { autoFillOfferData } from "@/lib/bulkImportUtils";

interface ApiConfig {
  id: string;
  provider_name: string;
  network_type: string;
  network_id: string;
  api_endpoint: string;
  is_active: boolean;
  created_at: string;
}

interface OfferPreview {
  offer_id: string;
  title: string;
  description: string;
  payout: number;
  currency: string;
  url: string;
  image_url?: string;
  status: string;
  countries?: string;
}

interface ImportOptions {
  skipDuplicates: boolean;
  updateExisting: boolean;
  autoActivate: boolean;
  showInOfferwall: boolean;
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
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    skipDuplicates: true,
    updateExisting: true,
    autoActivate: true,
    showInOfferwall: true,
  });

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
          toast({ title: "Error fetching configs", description: error.message, variant: "destructive" });
          return;
        }
        setConfigs(data || []);
      });
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Test API Connection - calls edge function
  const testConnection = async () => {
    if (!configForm.network_type || !configForm.network_id) {
      toast({ title: "Please fill Network Type and Network ID", variant: "destructive" });
      return;
    }

    const isHasOffers = configForm.network_type.toLowerCase().includes("has");
    if (isHasOffers && !configForm.api_key) {
      toast({ title: "Please enter API Key", variant: "destructive" });
      return;
    }

    if (!isHasOffers && !configForm.api_endpoint) {
      toast({ title: "Please fill API Endpoint", variant: "destructive" });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const provider = configForm.provider_name || configForm.network_type;
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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

      if (response.ok) {
        setConnectionStatus("success");
        toast({
          title: "Connection successful!",
          description: data.message || "API connection is working",
        });
        return;
      }

      throw new Error(data.error || "Connection test failed");
    } catch (error: any) {
      setConnectionStatus("error");
      toast({ 
        title: "Connection error", 
        description: error.message,
        variant: "destructive" 
      });
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

    const isHasOffers = configForm.network_type.toLowerCase().includes("has");
    if (isHasOffers && !configForm.api_key) {
      toast({ title: "Please enter API Key", variant: "destructive" });
      return;
    }

    if (!isHasOffers && !configForm.api_endpoint) {
      toast({ title: "Please fill API Endpoint", variant: "destructive" });
      return;
    }

    setPreviewing(true);
    setPreviewOffers([]);
    
    try {
      const provider = configForm.provider_name || configForm.network_type;
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
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
        toast({ title: `Found ${data.count} offers from API` });
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
        description: error.message,
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
      console.log('Import options:', importOptions);
      
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
          console.error('Error auto-filling offer data:', error, 'Offer:', offer);
          // Return original offer if auto-fill fails
          return {
            ...offer,
            provider: provider // Ensure provider is set
          };
        }
      });
      
      console.log('Offers to send count:', offersToSend.length);
      console.log('Sample offer to send:', offersToSend[0]);
      
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            provider,
            network_id: configForm.network_id,
            api_key: configForm.api_key,
            action: "import",
            // Pass import options to the backend
            import_options: importOptions,
            offers: offersToSend, // Send all offers to backend
          }),
        }
      );

      const data = await response.json();

      console.log('Import response:', data);
      console.log('Response status:', response.status);
      
      // Debug tracking URLs in imported offers
      if (data.debug?.sample_offers) {
        console.log('Sample imported offers with tracking URLs:', data.debug.sample_offers.slice(0, 3));
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to import offers");
      }

      // summary toast
      toast({
        title: "Import finished",
        description: `Imported: ${data.imported || 0}, Updated: ${data.updated || 0}, Failed: ${data.failed || 0}, Total: ${data.total || 0}`,
        variant: data.failed > 0 ? "destructive" : undefined,
      });

      // if there were errors, show a second toast with sample details
      if (data.debug?.sample_errors?.length) {
        const samples = data.debug.sample_errors
          .map((e: any) => `${e.offer_id}: ${e.error}`)
          .slice(0, 5)
          .join("; ");
        toast({
          title: "Some offers failed",
          description: samples,
          variant: "destructive",
        });
      }

      // also log the full debug object for power users
      console.debug("import response:", data);

      // Clear preview after successful import
      setPreviewOffers([]);
      setConfigForm({ provider_name: "", network_type: "", network_id: "", api_endpoint: "", api_key: "", is_active: true });
      
      // Trigger a global refresh event to notify other components
      window.dispatchEvent(new CustomEvent('offers-imported', { detail: { count: data.imported || 0 } }));
    } catch (error: any) {
      toast({ 
        title: "Error importing offers", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setImporting(false);
    }
  };

  // Save API configuration
  const saveConfig = async () => {
    if (!configForm.provider_name || !configForm.network_type || !configForm.network_id || !configForm.api_endpoint) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      provider_name: configForm.provider_name,
      network_type: configForm.network_type,
      network_id: configForm.network_id,
      api_endpoint: configForm.api_endpoint,
      is_active: configForm.is_active,
    };

    let error;
    if (editingConfig) {
      ({ error } = await supabase
        .from("api_import_configs")
        .update(payload)
        .eq("id", editingConfig.id));
    } else {
      ({ error } = await supabase
        .from("api_import_configs")
        .insert(payload));
    }

    if (error) {
      toast({ title: "Error saving config", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: editingConfig ? "Config updated!" : "Config created!" });
    setConfigDialogOpen(false);
    setEditingConfig(null);
    setConfigForm({ provider_name: "", network_type: "", network_id: "", api_endpoint: "", api_key: "", is_active: true });
    fetchConfigs();
  };

  // Delete configuration
  const deleteConfig = async (id: string) => {
    const { error } = await supabase
      .from("api_import_configs")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error deleting config", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Config deleted" });
    fetchConfigs();
  };

  // Toggle config active status
  const toggleConfig = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("api_import_configs")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      toast({ title: "Error updating config", variant: "destructive" });
      return;
    }

    fetchConfigs();
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
                <li>4. Click "Preview" to fetch actual offers from the API</li>
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
              
              {/* Import Options */}
              <div className="mb-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium mb-3">Import Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Skip Duplicates */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="skip-duplicates"
                      checked={importOptions.skipDuplicates}
                      onCheckedChange={(checked) => setImportOptions({...importOptions, skipDuplicates: checked})}
                    />
                    <label htmlFor="skip-duplicates" className="text-sm font-medium cursor-pointer">
                      Skip duplicate offers (check by Campaign ID)
                    </label>
                  </div>

                  {/* Update Existing */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="update-existing"
                      checked={importOptions.updateExisting}
                      onCheckedChange={(checked) => setImportOptions({...importOptions, updateExisting: checked})}
                    />
                    <label htmlFor="update-existing" className="text-sm font-medium cursor-pointer">
                      Update existing offers with new data
                    </label>
                  </div>

                  {/* Auto-activate */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="auto-activate"
                      checked={importOptions.autoActivate}
                      onCheckedChange={(checked) => setImportOptions({...importOptions, autoActivate: checked})}
                    />
                    <label htmlFor="auto-activate" className="text-sm font-medium cursor-pointer">
                      Auto-activate imported offers
                    </label>
                  </div>

                  {/* Show in Offerwall */}
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="show-offerwall"
                      checked={importOptions.showInOfferwall}
                      onCheckedChange={(checked) => setImportOptions({...importOptions, showInOfferwall: checked})}
                    />
                    <label htmlFor="show-offerwall" className="text-sm font-medium cursor-pointer">
                      🖼️ Show offers in Offerwall (visible to users)
                    </label>
                  </div>
                </div>
              </div>

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
    </div>
  );
};

export default ApiImport;
