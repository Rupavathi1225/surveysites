// Tracking Link Generator Service
// Centralized logic to generate tracking links for different affiliate networks

export interface TrackingLinkConfig {
  networkId: string;
  networkName: string;
  baseUrl: string;
  offerIdParam: string;
  affIdParam: string;
  defaultAffId: string;
}

// Network configurations
export const NETWORK_CONFIGS: Record<string, TrackingLinkConfig> = {
  cpamerchant: {
    networkId: 'cpamerchant',
    networkName: 'CPAMerchant',
    baseUrl: 'https://tracking.cpamerchant.com/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '3394'
  },
  chameleonads: {
    networkId: 'chameleonads',
    networkName: 'ChameleonAds',
    baseUrl: 'https://chameleonads.go2cloud.org/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '5696'
  },
  leadads: {
    networkId: 'leadads',
    networkName: 'LeadAds',
    baseUrl: 'https://leadads.go2jump.org/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '10843'
  }
};

export class TrackingLinkGenerator {
  /**
   * Generate tracking link for a specific network
   */
  static generateTrackingLink(
    networkId: string,
    offerId: string,
    affId?: string
  ): string {
    const config = NETWORK_CONFIGS[networkId.toLowerCase()];
    
    if (!config) {
      console.warn(`Unknown network: ${networkId}`);
      return '';
    }

    const affiliateId = affId || config.defaultAffId;
    const params = new URLSearchParams();
    params.append(config.offerIdParam, offerId.toString());
    params.append(config.affIdParam, affiliateId);

    return `${config.baseUrl}?${params.toString()}`;
  }

  /**
   * Generate tracking link by network name (for sheet imports)
   */
  static generateTrackingLinkByName(
    networkName: string,
    offerId: string,
    affId?: string
  ): string {
    // Find network by name (case-insensitive)
    const config = Object.values(NETWORK_CONFIGS).find(
      config => config.networkName.toLowerCase() === networkName.toLowerCase()
    );

    if (!config) {
      console.warn(`Unknown network name: ${networkName}`);
      return '';
    }

    return this.generateTrackingLink(config.networkId, offerId, affId);
  }

  /**
   * Auto-detect network from URL and generate tracking link
   */
  static generateFromExistingUrl(
    existingUrl: string,
    offerId: string,
    affId?: string
  ): string {
    // Try to detect network from existing URL
    for (const config of Object.values(NETWORK_CONFIGS)) {
      if (existingUrl.includes(config.baseUrl)) {
        return this.generateTrackingLink(config.networkId, offerId, affId);
      }
    }

    console.warn(`Could not detect network from URL: ${existingUrl}`);
    return existingUrl; // Return original URL if network not detected
  }

  /**
   * Get all supported networks
   */
  static getSupportedNetworks(): TrackingLinkConfig[] {
    return Object.values(NETWORK_CONFIGS);
  }

  /**
   * Check if a network is supported
   */
  static isNetworkSupported(networkId: string): boolean {
    return NETWORK_CONFIGS[networkId.toLowerCase()] !== undefined;
  }

  /**
   * Get network configuration by ID
   */
  static getNetworkConfig(networkId: string): TrackingLinkConfig | null {
    return NETWORK_CONFIGS[networkId.toLowerCase()] || null;
  }
}

// Utility function for migration scripts
export function updateOfferTrackingLink(
  offer: any,
  networkId?: string,
  networkName?: string,
  affId?: string
): { tracking_url: string, url: string } {
  let trackingUrl = offer.tracking_url || offer.url || '';
  let regularUrl = offer.url || offer.preview_url || '';

  // Try networkId first, then networkName
  if (networkId && TrackingLinkGenerator.isNetworkSupported(networkId)) {
    trackingUrl = TrackingLinkGenerator.generateTrackingLink(
      networkId,
      offer.offer_id || offer.id,
      affId
    );
  } else if (networkName) {
    trackingUrl = TrackingLinkGenerator.generateTrackingLinkByName(
      networkName,
      offer.offer_id || offer.id,
      affId
    );
  } else {
    // Try to auto-detect from existing URL
    trackingUrl = TrackingLinkGenerator.generateFromExistingUrl(
      trackingUrl,
      offer.offer_id || offer.id,
      affId
    );
  }

  return {
    tracking_url: trackingUrl,
    url: regularUrl // Keep the original landing page URL
  };
}
