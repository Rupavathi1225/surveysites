// Tracking Link System Tests
// Comprehensive tests for the tracking link generator system

import { TrackingLinkGenerator, NETWORK_CONFIGS, updateOfferTrackingLink } from '../services/trackingLinkGenerator';
import { SheetImportTrackingLink } from '../services/sheetImportTrackingLink';

describe('TrackingLinkGenerator', () => {
  describe('Network Configuration', () => {
    test('should have all 3 networks configured', () => {
      const networks = TrackingLinkGenerator.getSupportedNetworks();
      expect(networks).toHaveLength(3);
      
      const networkIds = networks.map(n => n.networkId);
      expect(networkIds).toContain('cpamerchant');
      expect(networkIds).toContain('chameleonads');
      expect(networkIds).toContain('leadads');
    });

    test('should have correct network configurations', () => {
      const cpamerchant = TrackingLinkGenerator.getNetworkConfig('cpamerchant');
      expect(cpamerchant).toEqual({
        networkId: 'cpamerchant',
        networkName: 'CPAMerchant',
        baseUrl: 'https://tracking.cpamerchant.com/aff_c',
        offerIdParam: 'offer_id',
        affIdParam: 'aff_id',
        defaultAffId: '3394'
      });
    });
  });

  describe('generateTrackingLink', () => {
    test('should generate CPAMerchant tracking link', () => {
      const url = TrackingLinkGenerator.generateTrackingLink('cpamerchant', '8724');
      expect(url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');
    });

    test('should generate ChameleonAds tracking link', () => {
      const url = TrackingLinkGenerator.generateTrackingLink('chameleonads', '7043');
      expect(url).toBe('https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696');
    });

    test('should generate LeadAds tracking link', () => {
      const url = TrackingLinkGenerator.generateTrackingLink('leadads', '76554');
      expect(url).toBe('https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843');
    });

    test('should use custom affiliate ID', () => {
      const url = TrackingLinkGenerator.generateTrackingLink('cpamerchant', '8724', '9999');
      expect(url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=9999');
    });

    test('should handle unknown network', () => {
      const url = TrackingLinkGenerator.generateTrackingLink('unknown', '8724');
      expect(url).toBe('');
    });

    test('should be case insensitive', () => {
      const url1 = TrackingLinkGenerator.generateTrackingLink('CPAMERCHANT', '8724');
      const url2 = TrackingLinkGenerator.generateTrackingLink('cpamerchant', '8724');
      expect(url1).toBe(url2);
    });
  });

  describe('generateTrackingLinkByName', () => {
    test('should generate link by network name', () => {
      const url = TrackingLinkGenerator.generateTrackingLinkByName('CPAMerchant', '8724');
      expect(url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');
    });

    test('should be case insensitive for network name', () => {
      const url1 = TrackingLinkGenerator.generateTrackingLinkByName('CHAMELEONADS', '7043');
      const url2 = TrackingLinkGenerator.generateTrackingLinkByName('chameleonads', '7043');
      expect(url1).toBe(url2);
    });

    test('should handle unknown network name', () => {
      const url = TrackingLinkGenerator.generateTrackingLinkByName('UnknownNetwork', '8724');
      expect(url).toBe('');
    });
  });

  describe('generateFromExistingUrl', () => {
    test('should detect CPAMerchant from URL', () => {
      const existingUrl = 'https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394';
      const url = TrackingLinkGenerator.generateFromExistingUrl(existingUrl, '9999');
      expect(url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=9999&aff_id=3394');
    });

    test('should detect ChameleonAds from URL', () => {
      const existingUrl = 'https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696';
      const url = TrackingLinkGenerator.generateFromExistingUrl(existingUrl, '9999');
      expect(url).toBe('https://chameleonads.go2cloud.org/aff_c?offer_id=9999&aff_id=5696');
    });

    test('should detect LeadAds from URL', () => {
      const existingUrl = 'https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843';
      const url = TrackingLinkGenerator.generateFromExistingUrl(existingUrl, '9999');
      expect(url).toBe('https://leadads.go2jump.org/aff_c?offer_id=9999&aff_id=10843');
    });

    test('should return original URL if network not detected', () => {
      const existingUrl = 'https://unknown-network.com/track?offer_id=8724';
      const url = TrackingLinkGenerator.generateFromExistingUrl(existingUrl, '9999');
      expect(url).toBe(existingUrl);
    });
  });

  describe('Utility Methods', () => {
    test('should check if network is supported', () => {
      expect(TrackingLinkGenerator.isNetworkSupported('cpamerchant')).toBe(true);
      expect(TrackingLinkGenerator.isNetworkSupported('unknown')).toBe(false);
    });

    test('should get network config', () => {
      const config = TrackingLinkGenerator.getNetworkConfig('cpamerchant');
      expect(config).toBeTruthy();
      expect(config?.networkId).toBe('cpamerchant');
    });
  });
});

describe('SheetImportTrackingLink', () => {
  describe('processSheetOffers', () => {
    test('should process offers with network_name', () => {
      const offers = [
        {
          offer_id: '8724',
          title: 'Test Offer',
          network_name: 'CPAMerchant',
          url: 'https://example.com'
        }
      ];

      const processed = SheetImportTrackingLink.processSheetOffers(offers);
      expect(processed[0].url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');
    });

    test('should process offers with network ID', () => {
      const offers = [
        {
          offer_id: '7043',
          title: 'Test Offer',
          network: 'chameleonads',
          url: 'https://example.com'
        }
      ];

      const processed = SheetImportTrackingLink.processSheetOffers(offers);
      expect(processed[0].url).toBe('https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696');
    });

    test('should auto-detect from existing URL', () => {
      const offers = [
        {
          offer_id: '76554',
          title: 'Test Offer',
          url: 'https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843'
        }
      ];

      const processed = SheetImportTrackingLink.processSheetOffers(offers);
      expect(processed[0].url).toBe('https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843');
    });
  });

  describe('validateNetworkName', () => {
    test('should validate correct network names', () => {
      expect(SheetImportTrackingLink.validateNetworkName('CPAMerchant')).toBe(true);
      expect(SheetImportTrackingLink.validateNetworkName('ChameleonAds')).toBe(true);
      expect(SheetImportTrackingLink.validateNetworkName('LeadAds')).toBe(true);
    });

    test('should be case insensitive', () => {
      expect(SheetImportTrackingLink.validateNetworkName('cpamerchant')).toBe(true);
      expect(SheetImportTrackingLink.validateNetworkName('CHAMELEONADS')).toBe(true);
    });

    test('should reject invalid network names', () => {
      expect(SheetImportTrackingLink.validateNetworkName('Invalid')).toBe(false);
    });
  });

  describe('getNetworkIdFromName', () => {
    test('should get network ID from name', () => {
      expect(SheetImportTrackingLink.getNetworkIdFromName('CPAMerchant')).toBe('cpamerchant');
      expect(SheetImportTrackingLink.getNetworkIdFromName('ChameleonAds')).toBe('chameleonads');
      expect(SheetImportTrackingLink.getNetworkIdFromName('LeadAds')).toBe('leadads');
    });

    test('should return null for invalid name', () => {
      expect(SheetImportTrackingLink.getNetworkIdFromName('Invalid')).toBeNull();
    });
  });
});

describe('updateOfferTrackingLink', () => {
  test('should update offer with networkId', () => {
    const offer = { offer_id: '8724', url: 'https://example.com' };
    const updatedUrl = updateOfferTrackingLink(offer, 'cpamerchant');
    expect(updatedUrl).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');
  });

  test('should update offer with networkName', () => {
    const offer = { offer_id: '7043', url: 'https://example.com' };
    const updatedUrl = updateOfferTrackingLink(offer, undefined, 'ChameleonAds');
    expect(updatedUrl).toBe('https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696');
  });

  test('should auto-detect from existing URL', () => {
    const offer = { 
      offer_id: '76554', 
      url: 'https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843' 
    };
    const updatedUrl = updateOfferTrackingLink(offer);
    expect(updatedUrl).toBe('https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843');
  });

  test('should use custom affiliate ID', () => {
    const offer = { offer_id: '8724', url: 'https://example.com' };
    const updatedUrl = updateOfferTrackingLink(offer, 'cpamerchant', undefined, '9999');
    expect(updatedUrl).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=9999');
  });
});

describe('Integration Tests', () => {
  test('should handle real-world scenarios', () => {
    // Test API import scenario
    const apiOffer = {
      offer_id: '8724',
      title: 'Mobile Survey App',
      description: 'Complete surveys for money',
      networkId: 'cpamerchant'
    };

    const trackingUrl = TrackingLinkGenerator.generateTrackingLink(
      apiOffer.networkId,
      apiOffer.offer_id
    );
    expect(trackingUrl).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');

    // Test sheet import scenario
    const sheetOffer = {
      offer_id: '7043',
      title: 'Game App Download',
      network_name: 'ChameleonAds',
      url: 'https://example.com'
    };

    const processedSheet = SheetImportTrackingLink.processSheetOffers([sheetOffer]);
    expect(processedSheet[0].url).toBe('https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696');

    // Test migration scenario
    const existingOffer = {
      offer_id: '76554',
      title: 'Video Streaming Service',
      provider: 'LeadAds',
      url: 'https://example.com/old-url'
    };

    const migratedUrl = updateOfferTrackingLink(existingOffer, 'leadads');
    expect(migratedUrl).toBe('https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843');
  });
});
