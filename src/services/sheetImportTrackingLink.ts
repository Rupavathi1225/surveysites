// Sheet Import Tracking Link Integration
// Integrates tracking link generation into sheet import functionality

import { TrackingLinkGenerator, NETWORK_CONFIGS } from './trackingLinkGenerator';

export interface SheetOfferData {
  offer_id: string;
  title: string;
  description?: string;
  url?: string;
  tracking_url?: string;
  network?: string;
  network_name?: string;
  payout?: number;
  currency?: string;
  // Add other sheet fields as needed
}

export class SheetImportTrackingLink {
  /**
   * Process sheet offers and generate tracking links
   */
  static processSheetOffers(offers: SheetOfferData[]): SheetOfferData[] {
    return offers.map(offer => {
      const processedOffer = { ...offer };
      
      // Try to generate tracking link using network name first
      if (offer.network_name) {
        const trackingUrl = TrackingLinkGenerator.generateTrackingLinkByName(
          offer.network_name,
          offer.offer_id
        );
        if (trackingUrl) {
          processedOffer.tracking_url = trackingUrl;
        }
      }
      // Try using network ID if network_name doesn't work
      else if (offer.network) {
        const trackingUrl = TrackingLinkGenerator.generateTrackingLink(
          offer.network,
          offer.offer_id
        );
        if (trackingUrl) {
          processedOffer.tracking_url = trackingUrl;
        }
      }
      // Try to auto-detect from existing URL
      else if (offer.url) {
        const trackingUrl = TrackingLinkGenerator.generateFromExistingUrl(
          offer.url,
          offer.offer_id
        );
        if (trackingUrl && trackingUrl !== offer.url) {
          processedOffer.tracking_url = trackingUrl;
        }
      }
      
      return processedOffer;
    });
  }

  /**
   * Get supported networks for sheet import dropdown
   */
  static getSupportedNetworksForSheet(): Array<{id: string, name: string}> {
    return Object.values(NETWORK_CONFIGS).map(config => ({
      id: config.networkId,
      name: config.networkName
    }));
  }

  /**
   * Validate network name from sheet
   */
  static validateNetworkName(networkName: string): boolean {
    return Object.values(NETWORK_CONFIGS).some(
      config => config.networkName.toLowerCase() === networkName.toLowerCase()
    );
  }

  /**
   * Get network ID from network name
   */
  static getNetworkIdFromName(networkName: string): string | null {
    const config = Object.values(NETWORK_CONFIGS).find(
      config => config.networkName.toLowerCase() === networkName.toLowerCase()
    );
    return config ? config.networkId : null;
  }

  /**
   * Generate tracking link for a single sheet offer
   */
  static generateTrackingLinkForSheetOffer(offer: SheetOfferData): string {
    // Try network name first
    if (offer.network_name) {
      const url = TrackingLinkGenerator.generateTrackingLinkByName(
        offer.network_name,
        offer.offer_id
      );
      if (url) return url;
    }

    // Try network ID
    if (offer.network) {
      const url = TrackingLinkGenerator.generateTrackingLink(
        offer.network,
        offer.offer_id
      );
      if (url) return url;
    }

    // Try auto-detection
    if (offer.url) {
      return TrackingLinkGenerator.generateFromExistingUrl(
        offer.url,
        offer.offer_id
      );
    }

    return offer.tracking_url || offer.url || '';
  }
}
