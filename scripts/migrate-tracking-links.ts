// Migration Script - Update existing offers from the 3 networks with proper tracking links
// This script updates existing offers in the database with network-specific tracking links

import { createClient } from '@supabase/supabase-js';
import { TrackingLinkGenerator } from '../src/services/trackingLinkGenerator';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

// Network mapping for migration
const NETWORK_MIGRATION_MAP = {
  // Provider names as they appear in the database -> networkId
  'cpamerchant': 'cpamerchant',
  'CPAMerchant': 'cpamerchant',
  'chameleonads': 'chameleonads',
  'ChameleonAds': 'chameleonads',
  'leadads': 'leadads',
  'LeadAds': 'leadads',
  'hasoffers': 'cpamerchant', // Default HasOffers to CPAMerchant
  'HasOffers': 'cpamerchant',
};

// URL patterns to detect networks
const URL_PATTERNS = {
  cpamerchant: ['tracking.cpamerchant.com'],
  chameleonads: ['chameleonads.go2cloud.org'],
  leadads: ['leadads.go2jump.org'],
};

class TrackingLinkMigration {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  /**
   * Detect network from existing URL
   */
  private detectNetworkFromUrl(url: string): string | null {
    if (!url) return null;

    for (const [networkId, patterns] of Object.entries(URL_PATTERNS)) {
      for (const pattern of patterns) {
        if (url.includes(pattern)) {
          return networkId;
        }
      }
    }

    return null;
  }

  /**
   * Get network ID from provider name
   */
  private getNetworkIdFromProvider(provider: string): string | null {
    return NETWORK_MIGRATION_MAP[provider as keyof typeof NETWORK_MIGRATION_MAP] || null;
  }

  /**
   * Update tracking links for all offers from the 3 networks
   */
  async migrateAllTrackingLinks(): Promise<void> {
    console.log('Starting tracking link migration...');

    try {
      // Get all offers that need tracking link updates
      const { data: offers, error } = await this.supabase
        .from('offers')
        .select('id, offer_id, provider, url, tracking_url, title')
        .in('provider', Object.keys(NETWORK_MIGRATION_MAP));

      if (error) {
        console.error('Error fetching offers:', error);
        return;
      }

      console.log(`Found ${offers.length} offers to process`);

      let updatedCount = 0;
      let skippedCount = 0;

      for (const offer of offers) {
        try {
          // Try to determine network
          let networkId = this.getNetworkIdFromProvider(offer.provider);
          
          // If not found by provider, try to detect from URL
          if (!networkId) {
            networkId = this.detectNetworkFromUrl(offer.url);
          }

          if (!networkId) {
            console.log(`Skipping offer ${offer.offer_id} - could not determine network`);
            skippedCount++;
            continue;
          }

          // Generate new tracking URL
          const newTrackingUrl = TrackingLinkGenerator.generateTrackingLink(
            networkId,
            offer.offer_id
          );

          if (!newTrackingUrl) {
            console.log(`Skipping offer ${offer.offer_id} - could not generate tracking URL`);
            skippedCount++;
            continue;
          }

          // Update the offer with both tracking_url and keep original url
          const { error: updateError } = await this.supabase
            .from('offers')
            .update({ 
              tracking_url: newTrackingUrl,
              url: offer.url // Keep original landing page URL
            })
            .eq('id', offer.id);

          if (updateError) {
            console.error(`Error updating offer ${offer.offer_id}:`, updateError);
            continue;
          }

          console.log(`✅ Updated offer ${offer.offer_id}: ${offer.title}`);
          console.log(`   Original URL: ${offer.url}`);
          console.log(`   Tracking URL: ${newTrackingUrl}`);
          console.log(`   Network: ${networkId}`);
          console.log('---');

          updatedCount++;

        } catch (error) {
          console.error(`Error processing offer ${offer.offer_id}:`, error);
        }
      }

      console.log(`\nMigration completed:`);
      console.log(`✅ Updated: ${updatedCount} offers`);
      console.log(`⏭️  Skipped: ${skippedCount} offers`);
      console.log(`📊 Total processed: ${offers.length} offers`);

    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  /**
   * Dry run - show what would be updated without making changes
   */
  async dryRun(): Promise<void> {
    console.log('Running dry run (no changes will be made)...');

    try {
      const { data: offers, error } = await this.supabase
        .from('offers')
        .select('id, offer_id, provider, url, title')
        .in('provider', Object.keys(NETWORK_MIGRATION_MAP));

      if (error) {
        console.error('Error fetching offers:', error);
        return;
      }

      console.log(`Found ${offers.length} offers to check`);

      let wouldUpdateCount = 0;
      let wouldSkipCount = 0;

      for (const offer of offers) {
        const networkId = this.getNetworkIdFromProvider(offer.provider) || 
                        this.detectNetworkFromUrl(offer.url);

        if (!networkId) {
          console.log(`⏭️  Would skip offer ${offer.offer_id}: ${offer.title} - no network detected`);
          wouldSkipCount++;
          continue;
        }

        const newTrackingUrl = TrackingLinkGenerator.generateTrackingLink(
          networkId,
          offer.offer_id
        );

        if (!newTrackingUrl) {
          console.log(`⏭️  Would skip offer ${offer.offer_id}: ${offer.title} - no tracking URL generated`);
          wouldSkipCount++;
          continue;
        }

        console.log(`✅ Would update offer ${offer.offer_id}: ${offer.title}`);
        console.log(`   Current URL: ${offer.url}`);
        console.log(`   New URL: ${newTrackingUrl}`);
        console.log(`   Network: ${networkId}`);
        console.log('---');

        wouldUpdateCount++;
      }

      console.log(`\nDry run results:`);
      console.log(`✅ Would update: ${wouldUpdateCount} offers`);
      console.log(`⏭️  Would skip: ${wouldSkipCount} offers`);
      console.log(`📊 Total checked: ${offers.length} offers`);

    } catch (error) {
      console.error('Dry run failed:', error);
    }
  }
}

// Run migration
async function main() {
  const migration = new TrackingLinkMigration();
  
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  if (isDryRun) {
    await migration.dryRun();
  } else {
    await migration.migrateAllTrackingLinks();
  }
}

// Export for use in other scripts
export { TrackingLinkMigration };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
