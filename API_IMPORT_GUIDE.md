# API Import Configuration Guide

## Overview
The API Import system now supports **any affiliate network platform** dynamically. You're no longer limited to pre-configured providers like CPX or BitLabs.

## New Fields Added

### 1. **Provider Name**
- Display name for your reference  
- Example: "My HasOffers Network", "CPX Research Setup", "Custom Tune Network"
- Used to identify the configuration in the dropdown

### 2. **Network Type** (NEW - Dropdown)
- The type of affiliate network platform
- Pre-filled options:
  - `HasOffers` - For HasOffers/Tune networks
  - `Tune` - Tune-specific networks
  - `CPX` - CPX Research
  - `BitLabs` - BitLabs platform
  - `Adscend` - Adscend Media
  - `PollFish` - PollFish surveys
  - `Custom` - Any other platform
- **This is what your manager provides in terms of the platform type**

### 3. **Network ID** (NEW - Text Input)
- Your unique identifier on that network
- Example: "12345" or "cpaerchant" or "your-network-id"
- **This is what your manager shares with you - the identifier for YOUR network on their platform**
- Used to fetch offers specific to your network

### 4. **API Endpoint**
- The full URL to the API endpoint
- Example: `https://api.hasoffers.com/v2/Offers.json`
- Changes based on the platform and your manager's specifications

### 5. **API Key Configuration** (FLEXIBLE)
Choose **ONE** method:

#### Option A: Supabase Secret Name (Recommended - More Secure)
- Store the API key as a Supabase environment secret
- Reference it by name: `CPX_API_KEY`, `HASOFFERS_SECRET`, etc.
- Example: Your manager says "Store your key as `MY_NETWORK_API_KEY` in Supabase secrets"

#### Option B: Direct API Key (Less Secure)
- Paste the API key directly in the field
- Useful for testing, but consider moving to Supabase secrets for production
- Field is masked with type="password"

## How to Add a New Network Configuration

### Step 1: Get Configuration Details from Your Manager
Your manager should provide:
```
- Network Type: HasOffers (or Tune, CPX, BitLabs, etc.)
- Network ID: 12345 or your-identifier
- API Endpoint: https://api.platform.com/v1/offers
- API Key: xxxxxxxxxxxx
```

### Step 2: Open API Configuration
1. Go to Admin Panel → API Import
2. Click "Configure API" button

### Step 3: Fill the Form
```
Provider Name:        "Google Ads Survey Network" (your choice)
Network Type:         "HasOffers" (from dropdown or select Custom)
Network ID:           "12345" (from your manager)
API Endpoint:         "https://api.hasoffers.com/v2/Offers.json"
API Key Option:       
  - Either: Select Supabase Secret Name: "HASOFFERS_API_KEY"
  - Or: Paste Direct API Key: "abc123xyz..."
```

### Step 4: Test Connection (Optional)
- Save the configuration
- Select it from the dropdown
- Click "Preview" to verify it works
- If successful, you'll see a list of available offers

### Step 5: Import Offers
- Once preview works, click "Import All"
- Offers will be added to your database

## Database Migration

A migration file has been created: `20260223000000_add_api_config_fields.sql`

This adds three new columns to the `api_import_configs` table:
- `network_type` (text) - The platform type
- `network_id` (text) - Your network identifier  
- `api_key` (text) - Optional direct API key storage

## Benefits

✅ **No Platform Limitation** - Support any affiliate network  
✅ **Dynamic Configuration** - Add new networks without code changes  
✅ **Flexible API Keys** - Use Supabase secrets OR direct keys  
✅ **Multiple Networks** - Add multiple configurations for different platforms  
✅ **Easy to Update** - Edit configurations anytime  

## Example Configuration

**Network #1: HasOffers**
- Provider Name: "HasOffers - US Network"  
- Network Type: HasOffers
- Network ID: 12345
- API Endpoint: https://api.hasoffers.com/v2/Offers.json
- API Key Secret: HASOFFERS_KEY_US

**Network #2: Tune**
- Provider Name: "Tune - Mobile Offers"
- Network Type: Tune
- Network ID: mobile-001
- API Endpoint: https://api.tune.com/api/v2/offers
- API Key Secret: TUNE_MOBILE_KEY

## Troubleshooting

### "Please fill all required fields"
- Ensure Network Type and Network ID are not empty
- Provide either an API Key Secret Name OR Direct API Key

### "Failed to fetch offers"
- Verify Network ID is correct
- Check API Endpoint format
- Ensure API Key is valid and not expired
- Test with your manager if credentials are correct

### "Token is invalid or expired" 
- The API key in Supabase secrets may be outdated
- Ask manager for a new key and update in Supabase
