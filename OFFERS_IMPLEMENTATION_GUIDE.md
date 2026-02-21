# Offers Management System - Comprehensive Implementation Guide

## Overview
This is a complete reimplementation of the Offers Management section with advanced bulk import features, inventory checking, duplicate detection, and recycle bin functionality.

## ✅ Implemented Features

### 1. **Bulk Offer Upload** (CSV Import)
- **Location**: Tab "Bulk Upload"
- **Features**:
  - Drag-and-drop CSV file upload
  - Supports multiple offers in a single upload
  - Auto-generates images based on offer name/description using DiceBear API
  - Auto-fills traffic source based on platform
  - Auto-detects vertical category (Finance, Gaming, Dating, etc.)
  - Auto-detects category type (GENERAL, FINANCE, etc.)

**CSV Format Required**:
- `title` - Offer name (required)
- `url` - Offer URL (required)  
- `payout` - Price/reward amount (required)
- `currency` - Currency code (USD, EUR, INR, GBP)
- `payout_model` - CPA, CPL, CPI, CPC
- `description` - Optional description
- `countries` - Target countries
- `platform` - web, ios, android
- `is_public` - true/false for visibility toggle

### 2. **Duplicate Detection & Handling**
- **Matching Criteria Used**:
  1. **Offer/Serial ID** (40% weight) - Critical match
  2. **Offer Title** (25% weight) - 80% text similarity required
  3. **Description** (15% weight) - 70% similarity
  4. **Country** (10% weight) - Exact match
  5. **Platform** (10% weight) - Exact match
  6. **Payout** (5% weight) - Within 10% variance

- **Features**:
  - Automatically detects duplicates during upload preview
  - Shows duplicate offers with matching criteria
  - **Skip Duplicates Checkbox**: Option to skip importing duplicate offers
  - Logs all duplicate detection actions for audit trail
  - Score-based matching (threshold: 60/100)

**How It Works**:
1. Upload CSV file
2. System analyzes offers against existing inventory
3. Shows preview with duplicate indicators
4. Select "Skip Duplicates" checkbox if you want to skip matches
5. Click "Import" to process

### 3. **Public/Private Visibility Control**
- **Feature**: Toggle offers between public and private
- **Option**: `is_public` column in CSV or toggle in form
- **Default**: All offers are public by default
- **Use Case**: Hide test offers or restricted availability offers

### 4. **Missing Offers Detection** (Inventory Check)
- **Location**: Tab "Missing Offers"
- **Purpose**: Cross-check your inventory against uploaded data

**Matching Criteria for Missing Offers**:
- Offer Name
- Payout Amount  
- Country
- Platform (Android, Web, iOS)

**How to Use**:
1. Click "Generate Report" button
2. Upload your CSV file with all offers you have
3. System compares against current inventory
4. Generates report showing missing offers
5. Download missing offers as CSV for re-importing

**Output**:
- Lists which offers are missing from your system
- Shows detailed information for each missing offer
- Exportable CSV for quick import
- Previous reports are saved with timestamps

### 5. **Multiple Selection & Bulk Delete**
- **Feature**: Select multiple offers at once
  - Checkbox in table header to select/deselect all
  - Individual checkboxes for each offer
  - Shows count of selected offers: "Delete Selected (5)"
- **Action**: Move selected offers to Recycle Bin
- **Audit**: Action is logged for compliance

### 6. **Recycle Bin with 30-Day Retention**
- **Location**: Tab "Recycle Bin"
- **Features**:
  - All deleted offers stored for 30 days
  - Shows deletion date and remaining days
  - Red badge when less than 7 days remain
  - Restore any deleted offer within 30 days
  - Permanent delete option for immediate removal
  - Bulk restore and bulk permanent delete options
  - Auto-cleanup of expired items (automatic, runs in background)

**Recycle Bin Status Indicators**:
- **Green**: 7+ days remaining
- **Red**: Less than 7 days remaining
- **Auto-purge**: Items older than 30 days are automatically deleted

### 7. **Offer Visibility Toggle**
- **Private Offers**: Hidden from public view
- **Public Offers**: Visible to users
- **Management**: Toggle via checkbox in offers list
- **Storage**: `is_public` field in database

### 8. **Auto-Generated Images**
- Uses Pexels API for real photos (requires API key - see below)
- Falls back to Lorem Picsum for free real images
- Final fallback to colored placeholders with offer title text

**Getting Real Images:**
1. Get a free Pexels API key at: https://www.pexels.com/api/
2. Add `VITE_PEXELS_API_KEY=your_api_key` to your `.env` file
3. Images will now be real photos matching the offer category/vertical

**How it works:**
- Primary: Uses Pexels API (200 free requests/month) for real photos
- Fallback: Uses Lorem Picsum (free, no API key needed) for random real photos
- Ultimate fallback: Colored placeholders with offer title text
- Images are consistent per offer (same offer = same image)
- Can be overridden with custom image upload

### 9. **Auto-Fill Intelligence**
The system automatically determines:

**Traffic Sources**:
- Web platform → "Direct"
- iOS/Android → "Push Notifications"
- Default options: "Social Media", "Email", "Referral"

**Verticals** (Categories):
Based on keywords in title/description:
- Finance: bank, loan, credit, mortgage
- Gaming: game, casino, slot, poker
- Dating: dating, match, romantic
- Shopping: shop, store, retail
- Health: health, medical, fitness
- Education: course, learn, training
- Travel: hotel, flight, booking
- Real Estate: property, house, apartment
- Utilities: vpn, antivirus, software
- Content: movie, music, streaming

### 10. **Comprehensive Import Logging**
All bulk imports are logged with:
- Batch ID (unique identifier)
- Total records processed
- Successful imports count
- Failed imports count
- Duplicates skipped count
- Error log (if any failures)
- Import data snapshot
- Timestamp

## 📊 Data Structure

### New Database Tables Created

#### `recycle_bin`
```sql
- id (UUID) - Primary key
- offer_id (UUID) - Reference to offers
- offer_data (JSONB) - Complete offer snapshot
- deleted_by (UUID) - User who deleted
- deleted_at (TIMESTAMP) - Deletion time
- expires_at (TIMESTAMP) - Auto-expiry (30 days)
- restored_at (TIMESTAMP) - Restoration time
- created_at (TIMESTAMP)
```

#### `bulk_import_logs`
```sql
- id (UUID) - Primary key
- batch_id (UUID) - Import batch identifier
- import_type (TEXT) - 'csv', 'sheet', 'api'
- total_records (INTEGER)
- successful_imports (INTEGER)
- failed_imports (INTEGER)
- duplicate_skipped (INTEGER)
- import_data (JSONB) - Full dataset
- error_log (JSONB) - Error details
- imported_by (UUID) - User who imported
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

#### `duplicate_detection_logs`
```sql
- id (UUID) - Primary key
- batch_id (UUID)
- offer_name (TEXT)
- matching_offer_id (UUID) - ID of existing offer
- matching_criteria (TEXT[]) - Array of matched fields
- action (TEXT) - 'skipped', 'merged', 'import_new'
- created_at (TIMESTAMP)
```

#### `missing_offers_report`
```sql
- id (UUID) - Primary key
- batch_id (UUID)
- report_name (TEXT)
- uploaded_offers (JSONB) - Array of offers from CSV
- missing_offers (JSONB) - Array of missing offers
- matching_criteria (TEXT[]) - Criteria used
- report_data (JSONB) - Statistics
- created_by (UUID)
- created_at (TIMESTAMP)
```

### Updated Offers Table Columns
```sql
- is_public (BOOLEAN) - Default: true
- is_deleted (BOOLEAN) - Soft delete flag
- deleted_at (TIMESTAMP) - Deletion timestamp
- import_batch_id (UUID) - Reference to bulk import batch
```

## 🔧 Utility Functions

### `bulkImportUtils.ts`
- `generateOfferImage()` - Auto-generate image URLs
- `generateTrafficSource()` - Auto-detect traffic source
- `detectVertical()` - Categorize into vertical
- `detectCategory()` - Determine category type
- `autoFillOfferData()` - Fill missing fields
- `validateOfferData()` - Validate offer data
- `parseCSV()` - Parse CSV files
- `offersToCsv()` - Export offers to CSV
- `downloadCsv()` - Download CSV file
- `normalizeOfferForComparison()` - Normalize for matching

### `duplicateDetection.ts`
- `checkOfferDuplicate()` - Check single offer
- `checkBatchDuplicates()` - Check multiple offers
- `logDuplicateDetection()` - Log detection result
- Uses Levenshtein distance for string similarity

### `missingOffersDetection.ts`
- `detectMissingOffers()` - Find missing offers
- `saveMissingOffersReport()` - Store report
- `getMissingOffersReports()` - Retrieve reports
- `deleteMissingOffersReport()` - Delete old reports

### `recycleBin.ts`
- `moveToRecycleBin()` - Soft delete
- `moveMultipleToRecycleBin()` - Bulk soft delete
- `getRecycleBinItems()` - List deleted offers
- `restoreFromRecycleBin()` - Restore single
- `restoreMultipleFromRecycleBin()` - Bulk restore
- `permanentlyDeleteFromRecycleBin()` - Hard delete
- `permanentlyDeleteMultipleFromRecycleBin()` - Bulk hard delete
- `cleanupExpiredRecycleBinItems()` - Auto-cleanup
- `calculateRemainingDays()` - Days until expiry

## 🎯 Workflow Examples

### Example 1: Import New Offers with Duplicate Checking
1. Go to **"Bulk Upload"** tab
2. Drag CSV file (200 offers)
3. System checks for duplicates
4. Shows preview: "Found 200 offers. 15 duplicates detected."
5. Check **"Skip Duplicates"** checkbox
6. Click **"Import 185 Offers"**
7. Success: "Successfully imported: 185, Failed: 0, Skipped: 15"

### Example 2: Check Missing Offers
1. Go to **"Missing Offers"** tab
2. Click **"Generate Report"**
3. Upload your master list (500 offers)
4. System analyzes and creates report
5. Shows: "Found 45 missing offers out of 500"
6. Click **"Export"** to download missing offers CSV
7. Import missing offers in another bulk upload

### Example 3: Recover Deleted Offer
1. Go to **"Recycle Bin"** tab
2. Search for deleted offer (e.g., "Casino Game ABC")
3. Check days remaining (e.g., "18 days")
4. Click **"Restore"** button
5. Offer returns to main offers list
6. Offer is live again

## 🔐 Security & Permissions
- All operations require admin or sub-admin role
- Row Level Security (RLS) enabled on all tables
- Audit trail through logging tables
- Soft deletes preserve data integrity
- 30-day retention for compliance

## 📈 Performance
- Indexed columns for fast queries:
  - `recycle_bin.deleted_at`, `expires_at`
  - `bulk_import_logs.batch_id`
  - `duplicate_detection_logs.batch_id`
  - `missing_offers_report.batch_id`
- Efficient batch operations
- Auto-cleanup prevents database bloat

## 🚀 Next Steps (Optional Enhancements)
1. **API Imports**: Connect to provider APIs (CPX Research, BitLabs)
2. **Google Sheets Integration**: Direct import from sheets
3. **Scheduled Imports**: Cron job for auto-sync
4. **Image Upload**: Direct image upload instead of generation
5. **Advanced Filters**: Filter by date range, source, etc.
6. **Bulk Edit**: Edit multiple offers at once
7. **Export Templates**: Download CSV templates
8. **Import History**: View all past imports
9. **Email Notifications**: Alert on import completion
10. **Webhook Integration**: Receive offers from external sources

## ✨ Features Summary
- ✅ Bulk CSV upload with 200+ offers support
- ✅ Automatic image generation
- ✅ Intelligent duplicate detection (6 matching criteria)
- ✅ Missing offers cross-check
- ✅ Public/Private visibility control
- ✅ Multiple selection and bulk operations
- ✅ 30-day recycle bin with auto-cleanup
- ✅ Comprehensive audit logging
- ✅ Auto-fill intelligence for categories
- ✅ Error handling and validation
- ✅ Export capabilities (CSV)

## 📝 CSV Example Format
```csv
title,url,payout,currency,payout_model,description,country,platform,is_public
"Gaming App X","https://example.com/game",10,USD,CPA,"Casual gaming app","US,UK,CA",ios,true
"Finance Loan","https://example.com/loan",25,USD,CPL,"Quick loan approval","US",web,true
"Shopping Deal","https://example.com/shop",5,USD,CPC,"E-commerce rewards","US,UK,AU,NZ",web,false
```

---

## 🎨 UI Tabs Overview

### 1. **Offers Tab**
- Full offers list with all columns
- Add/Edit/Delete individual offers
- Multiple selection with bulk delete
- Public/Private toggle per offer
- Status toggle (Active/Inactive)

### 2. **Bulk Upload Tab**
- CSV file upload (drag-and-drop)
- Preview of parsed offers
- Duplicate detection display
- Skip duplicates checkbox
- Import progress tracking

### 3. **Missing Offers Tab**
- Generate report button
- Upload CSV to compare
- View previous reports
- Export missing offers
- Delete old reports

### 4. **Recycle Bin Tab**
- List of deleted offers
- Days remaining counter
- Bulk restore/delete options
- Restore individual offers
- Permanent delete with confirmation

---

**Last Updated**: February 20, 2026
**Status**: Production Ready
