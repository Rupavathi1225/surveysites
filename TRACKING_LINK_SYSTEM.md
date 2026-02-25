# Tracking Link Generator System

## Overview
Centralized system to generate tracking links for 3 affiliate networks:
- **CPAMerchant**: `https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394`
- **ChameleonAds**: `https://chameleonads.go2cloud.org/aff_c?offer_id=7043&aff_id=5696`
- **LeadAds**: `https://leadads.go2jump.org/aff_c?offer_id=76554&aff_id=10843`

## Architecture

### 1. Core Service (`src/services/trackingLinkGenerator.ts`)
- **TrackingLinkGenerator** class with static methods
- **NETWORK_CONFIGS** with network configurations
- **updateOfferTrackingLink** utility function

### 2. API Import Integration (`supabase/functions/import-offers/index.ts`)
- Integrated into `mapOffer()` function
- Uses `networkId` from API request
- Generates tracking URLs automatically

### 3. Sheet Import Integration (`src/services/sheetImportTrackingLink.ts`)
- **SheetImportTrackingLink** class
- Processes sheet offers with network names
- Auto-detects networks from existing URLs

### 4. Migration Script (`scripts/migrate-tracking-links.ts`)
- Updates existing offers in database
- Detects networks from provider/URL
- Dry-run mode for testing

## Usage Examples

### API Import
```typescript
// API request includes networkId
{
  "network_id": "cpamerchant",
  "api_key": "your-key",
  "action": "import",
  "offers": [...]
}

// Automatically generates: https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394
```

### Sheet Import
```typescript
// Sheet data with network name
{
  "offer_id": "8724",
  "title": "Test Offer",
  "network_name": "CPAMerchant"
}

// Automatically generates tracking link
```

### Direct Usage
```typescript
import { TrackingLinkGenerator } from './services/trackingLinkGenerator';

// Generate by network ID
const url = TrackingLinkGenerator.generateTrackingLink('cpamerchant', '8724');

// Generate by network name
const url = TrackingLinkGenerator.generateTrackingLinkByName('CPAMerchant', '8724');

// Auto-detect from existing URL
const url = TrackingLinkGenerator.generateFromExistingUrl(existingUrl, '8724');
```

## Network Configurations

### CPAMerchant
- **Network ID**: `cpamerchant`
- **Base URL**: `https://tracking.cpamerchant.com/aff_c`
- **Default Aff ID**: `3394`
- **Parameters**: `offer_id`, `aff_id`

### ChameleonAds
- **Network ID**: `chameleonads`
- **Base URL**: `https://chameleonads.go2cloud.org/aff_c`
- **Default Aff ID**: `5696`
- **Parameters**: `offer_id`, `aff_id`

### LeadAds
- **Network ID**: `leadads`
- **Base URL**: `https://leadads.go2jump.org/aff_c`
- **Default Aff ID**: `10843`
- **Parameters**: `offer_id`, `aff_id`

## Implementation Steps

### ✅ 1. Create Tracking Link Generator Service
- [x] Core service with network configurations
- [x] Static methods for link generation
- [x] Network detection utilities

### ✅ 2. Integrate into API Import
- [x] Add network configurations to edge function
- [x] Update `mapOffer()` to accept `networkId`
- [x] Generate tracking URLs based on network
- [x] Deploy updated function

### ✅ 3. Integrate into Sheet Import
- [x] Create sheet import service
- [x] Network name validation
- [x] Auto-detection from URLs
- [x] Batch processing support

### ✅ 4. Create Migration Script
- [x] Database migration script
- [x] Network detection logic
- [x] Dry-run mode
- [x] Progress logging

## Migration Usage

### Dry Run (Test)
```bash
npm run migrate:tracking-links -- --dry-run
```

### Live Migration
```bash
npm run migrate:tracking-links
```

### Manual Migration
```typescript
import { TrackingLinkMigration } from './scripts/migrate-tracking-links';

const migration = new TrackingLinkMigration();
await migration.dryRun(); // Test first
await migration.migrateAllTrackingLinks(); // Then run
```

## Features

### 🎯 Network Detection
- By `networkId` parameter
- By `network_name` field
- By existing URL patterns
- By provider name mapping

### 🔗 Link Generation
- Automatic parameter insertion
- Default affiliate ID fallback
- Custom affiliate ID support
- URL encoding and validation

### 📊 Migration Support
- Bulk update existing offers
- Network pattern detection
- Provider name mapping
- Progress tracking and logging

### 🛡️ Error Handling
- Unknown network warnings
- Invalid URL handling
- Graceful fallbacks
- Detailed logging

## Testing

### Unit Tests
```typescript
import { TrackingLinkGenerator } from './services/trackingLinkGenerator';

// Test network detection
expect(TrackingLinkGenerator.isNetworkSupported('cpamerchant')).toBe(true);

// Test link generation
const url = TrackingLinkGenerator.generateTrackingLink('cpamerchant', '8724');
expect(url).toBe('https://tracking.cpamerchant.com/aff_c?offer_id=8724&aff_id=3394');
```

### Integration Tests
```typescript
// Test API import
const response = await fetch('/api/import-offers', {
  method: 'POST',
  body: JSON.stringify({
    network_id: 'cpamerchant',
    action: 'preview',
    offers: [{ offer_id: '8724', title: 'Test' }]
  })
});

// Test sheet import
const processed = SheetImportTrackingLink.processSheetOffers([
  { offer_id: '8724', network_name: 'CPAMerchant' }
]);
```

## Future Enhancements

### 🚀 Planned Features
- [ ] Additional network support
- [ ] Custom affiliate ID management
- [ ] Link performance tracking
- [ ] Bulk link validation
- [ ] Network-specific analytics

### 🔧 Improvements
- [ ] TypeScript strict mode
- [ ] Unit test coverage
- [ ] Performance optimization
- [ ] Error recovery mechanisms

## Troubleshooting

### Common Issues

**Issue**: Tracking links not generating
**Solution**: Check network ID spelling and configuration

**Issue**: Migration script fails
**Solution**: Run with `--dry-run` first to check offers

**Issue**: Sheet import not working
**Solution**: Verify network name matches exactly

### Debug Logging
```typescript
// Enable debug mode
console.log('Network detection:', networkId);
console.log('Generated URL:', trackingUrl);
```

## Support

For issues or questions:
1. Check network configurations
2. Run migration in dry-run mode
3. Review console logs
4. Validate network ID/name spelling
