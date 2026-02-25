// Tracking Link Demo Component
// Interactive demo to showcase the tracking link generator system

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrackingLinkGenerator } from '@/services/trackingLinkGenerator';
import { SheetImportTrackingLink } from '@/services/sheetImportTrackingLink';

export function TrackingLinkDemo() {
  const [selectedNetwork, setSelectedNetwork] = useState('cpamerchant');
  const [offerId, setOfferId] = useState('8724');
  const [customAffId, setCustomAffId] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [networkName, setNetworkName] = useState('CPAMerchant');
  const [existingUrl, setExistingUrl] = useState('');

  const networks = TrackingLinkGenerator.getSupportedNetworks();

  const generateByNetworkId = () => {
    const url = TrackingLinkGenerator.generateTrackingLink(
      selectedNetwork,
      offerId,
      customAffId || undefined
    );
    setGeneratedUrl(url);
  };

  const generateByNetworkName = () => {
    const url = TrackingLinkGenerator.generateTrackingLinkByName(
      networkName,
      offerId,
      customAffId || undefined
    );
    setGeneratedUrl(url);
  };

  const generateFromExistingUrl = () => {
    const url = TrackingLinkGenerator.generateFromExistingUrl(
      existingUrl,
      offerId,
      customAffId || undefined
    );
    setGeneratedUrl(url);
  };

  const testSheetImport = () => {
    const sheetOffers = [
      {
        offer_id: offerId,
        title: 'Demo Offer',
        network_name: networkName,
        url: existingUrl || 'https://example.com'
      }
    ];

    const processed = SheetImportTrackingLink.processSheetOffers(sheetOffers);
    setGeneratedUrl(processed[0].url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔗 Tracking Link Generator Demo</CardTitle>
          <CardDescription>
            Interactive demo for the tracking link generator system supporting CPAMerchant, ChameleonAds, and LeadAds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="network-id" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="network-id">Network ID</TabsTrigger>
              <TabsTrigger value="network-name">Network Name</TabsTrigger>
              <TabsTrigger value="auto-detect">Auto Detect</TabsTrigger>
              <TabsTrigger value="sheet-import">Sheet Import</TabsTrigger>
            </TabsList>

            <TabsContent value="network-id" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="network">Network</Label>
                  <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((network) => (
                        <SelectItem key={network.networkId} value={network.networkId}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{network.networkId}</Badge>
                            {network.networkName}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-id">Offer ID</Label>
                  <Input
                    id="offer-id"
                    value={offerId}
                    onChange={(e) => setOfferId(e.target.value)}
                    placeholder="8724"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-aff-id">Custom Affiliate ID (Optional)</Label>
                <Input
                  id="custom-aff-id"
                  value={customAffId}
                  onChange={(e) => setCustomAffId(e.target.value)}
                  placeholder="Leave empty to use default"
                />
              </div>
              <Button onClick={generateByNetworkId} className="w-full">
                Generate Tracking Link
              </Button>
            </TabsContent>

            <TabsContent value="network-name" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="network-name">Network Name</Label>
                  <Select value={networkName} onValueChange={setNetworkName}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {networks.map((network) => (
                        <SelectItem key={network.networkName} value={network.networkName}>
                          {network.networkName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-id-name">Offer ID</Label>
                  <Input
                    id="offer-id-name"
                    value={offerId}
                    onChange={(e) => setOfferId(e.target.value)}
                    placeholder="8724"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-aff-id-name">Custom Affiliate ID (Optional)</Label>
                <Input
                  id="custom-aff-id-name"
                  value={customAffId}
                  onChange={(e) => setCustomAffId(e.target.value)}
                  placeholder="Leave empty to use default"
                />
              </div>
              <Button onClick={generateByNetworkName} className="w-full">
                Generate by Network Name
              </Button>
            </TabsContent>

            <TabsContent value="auto-detect" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="existing-url">Existing URL</Label>
                <Input
                  id="existing-url"
                  value={existingUrl}
                  onChange={(e) => setExistingUrl(e.target.value)}
                  placeholder="https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-id-detect">Offer ID</Label>
                <Input
                  id="offer-id-detect"
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  placeholder="8724"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-aff-id-detect">Custom Affiliate ID (Optional)</Label>
                <Input
                  id="custom-aff-id-detect"
                  value={customAffId}
                  onChange={(e) => setCustomAffId(e.target.value)}
                  placeholder="Leave empty to use default"
                />
              </div>
              <Button onClick={generateFromExistingUrl} className="w-full">
                Auto-Detect & Generate
              </Button>
            </TabsContent>

            <TabsContent value="sheet-import" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="network-name-sheet">Network Name</Label>
                <Select value={networkName} onValueChange={setNetworkName}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {networks.map((network) => (
                      <SelectItem key={network.networkName} value={network.networkName}>
                        {network.networkName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-id-sheet">Offer ID</Label>
                <Input
                  id="offer-id-sheet"
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  placeholder="8724"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="existing-url-sheet">Existing URL (Optional)</Label>
                <Input
                  id="existing-url-sheet"
                  value={existingUrl}
                  onChange={(e) => setExistingUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              <Button onClick={testSheetImport} className="w-full">
                Test Sheet Import Processing
              </Button>
            </TabsContent>
          </Tabs>

          {generatedUrl && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Generated Tracking Link</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm break-all">{generatedUrl}</code>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyToClipboard} variant="outline" size="sm">
                    📋 Copy to Clipboard
                  </Button>
                  <Button
                    onClick={() => window.open(generatedUrl, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    🔗 Open in New Tab
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 Network Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {networks.map((network) => (
              <div key={network.networkId} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{network.networkName}</h3>
                  <Badge variant="outline">{network.networkId}</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div><strong>Base URL:</strong> {network.baseUrl}</div>
                  <div><strong>Default Aff ID:</strong> {network.defaultAffId}</div>
                  <div><strong>Parameters:</strong> {network.offerIdParam}, {network.affIdParam}</div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-muted-foreground">
                    Example: {network.baseUrl}?{network.offerIdParam}=8724&{network.affIdParam}={network.defaultAffId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
