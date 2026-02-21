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
  RefreshCw, 
  Loader2, 
  Check, 
  X, 
  Eye, 
  Trash2,
  Settings,
  Zap,
  AlertCircle
} from "lucide-react";

interface ApiConfig {
  id: string;
  provider_name: string;
  api_endpoint: string;
  api_key_secret_name: string;
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

const ApiImport = () => {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewOffers, setPreviewOffers] = useState<OfferPreview[]>([]);
  const [importing, setImporting] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ApiConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    provider_name: "",
    api_endpoint: "",
    api_key_secret_name: "",
    is_active: true,
  });

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

  // Fetch offers preview from API
  const fetchPreview = async () => {
    if (!selectedProvider) {
      toast({ title: "Please select a provider", variant: "destructive" });
      return;
    }

    setPreviewing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            provider: selectedProvider,
            action: "preview",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch offers");
      }

      setPreviewOffers(data.offers || []);
      toast({ title: `Found ${data.count} offers` });
    } catch (error: any) {
      toast({ 
        title: "Error fetching offers", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setPreviewing(false);
    }
  };

  // Import all previewed offers
  const importOffers = async () => {
    if (!selectedProvider) {
      toast({ title: "Please select a provider", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            provider: selectedProvider,
            action: "import",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import offers");
      }

      toast({ 
        title: "Import complete!", 
        description: `Imported: ${data.imported}, Skipped: ${data.skipped}, Total: ${data.total}` 
      });
      
      setPreviewOffers([]);
      setSelectedProvider("");
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
    if (!configForm.provider_name || !configForm.api_endpoint || !configForm.api_key_secret_name) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const payload = {
      provider_name: configForm.provider_name,
      api_endpoint: configForm.api_endpoint,
      api_key_secret_name: configForm.api_key_secret_name,
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
    setConfigForm({ provider_name: "", api_endpoint: "", api_key_secret_name: "", is_active: true });
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
    setConfigForm({ provider_name: "", api_endpoint: "", api_key_secret_name: "", is_active: true });
    setConfigDialogOpen(true);
  };

  const openEditConfig = (config: ApiConfig) => {
    setEditingConfig(config);
    setConfigForm({
      provider_name: config.provider_name,
      api_endpoint: config.api_endpoint,
      api_key_secret_name: config.api_key_secret_name,
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
                <li>1. Configure your API credentials in the configuration section</li>
                <li>2. Add your API keys as Supabase secrets (CPX_API_KEY, BITLABS_API_KEY, etc.)</li>
                <li>3. Select a provider and click "Preview Offers" to see available offers</li>
                <li>4. Click "Import All" to import the offers into your database</li>
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
            Fetch and import offers from external survey providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider..." />
                </SelectTrigger>
                <SelectContent>
                  {configs.filter(c => c.is_active).map((config) => (
                    <SelectItem key={config.id} value={config.provider_name}>
                      {config.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchPreview}
              disabled={previewing || !selectedProvider}
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
                  Import All
                </>
              )}
            </Button>
          </div>

          {/* Preview Table */}
          {previewOffers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Preview ({previewOffers.length} offers)
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
                      <p className="text-xs text-muted-foreground font-mono">
                        {config.api_endpoint}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Secret: {config.api_key_secret_name}
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
              <label className="text-sm font-medium">Provider Name</label>
              <Input 
                value={configForm.provider_name}
                onChange={(e) => setConfigForm({ ...configForm, provider_name: e.target.value })}
                placeholder="e.g., CPX Research"
              />
            </div>
            <div>
              <label className="text-sm font-medium">API Endpoint</label>
              <Input 
                value={configForm.api_endpoint}
                onChange={(e) => setConfigForm({ ...configForm, api_endpoint: e.target.value })}
                placeholder="https://api.provider.com/v1/offers"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Secret Name (Env Variable)</label>
              <Input 
                value={configForm.api_key_secret_name}
                onChange={(e) => setConfigForm({ ...configForm, api_key_secret_name: e.target.value })}
                placeholder="e.g., CPX_API_KEY"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This should match the secret name you set in Supabase
              </p>
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
