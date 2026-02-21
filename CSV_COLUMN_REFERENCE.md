# Bulk Offers Import - CSV Column Reference

## Complete Column List

| Column Name | Type | Required? | Description | Example |
|---|---|---|---|---|
| **offer_id** | Text | Optional | Unique identifier for the offer (serial number) | OFF-001, GAME-123 |
| **title** | Text | ✅ Required | Offer name/title | "Casino Game X", "Loan App" |
| **url** | Text | ✅ Required | Direct link to offer landing page | https://example.com/game |
| **country** | Text | Recommended | Target country (comma-separated for multiple) | US, UK, CA |
| **payout** | Number | ✅ Required | Reward amount for completion | 10, 25, 100 |
| **description** | Text | Recommended | Detailed offer description | "Play and earn rewards daily" |
| **platform** | Text | Optional | Platform availability | web, ios, android |
| **preview_url** | Text | Optional | URL to offer preview/demo | https://example.com/preview |
| **vertical** | Text | Optional | Category type (auto-detected if blank) | Gaming, Finance, Dating |
| **device** | Text | Optional | Device requirement | mobile, desktop, tablet |
| **image_url** | Text | Optional | Image URL (auto-generated if blank) | https://example.com/image.jpg |
| **traffic_sources** | Text | Optional | Source of traffic (auto-filled if blank) | Social Media, Email, Direct |
| **expiry** | Date | Optional | Expiration date for the offer | 2026-12-31 |
| **devices** | Text | Optional | Additional device specifications | mobile, desktop |
| **non_access_url** | Text | Optional | URL to show when user doesn't qualify | https://example.com/notfound |
| **allowed_countries** | Text | Optional | Countries where offer is available | US, UK, CA, AU |
| **payout_model** | Text | Optional | How user is rewarded | CPA, CPL, CPI, CPC |
| **currency** | Text | Optional | Payout currency | USD, EUR, INR, GBP |
| **percent** | Number | Optional | Commission percentage | 5, 10, 15 |

---

## Auto-Fill & Auto-Detection

The system automatically fills missing data:

### 1. **image_url** (Auto-Generated)
- If left blank, automatically generated using DiceBear API
- Based on offer name or vertical category
- Example: `https://api.dicebear.com/7.x/icons/svg?seed=gaming`

### 2. **traffic_sources** (Auto-Detected)
| Platform | Auto-Filled Value |
|---|---|
| web | Direct |
| ios, android | Push Notifications |
| (none) | Random (Social Media/Email/Referral) |

### 3. **vertical** (Auto-Detected from title/description)
| Keywords | Category |
|---|---|
| bank, loan, credit, mortgage, trading | Finance |
| game, casino, slot, poker, bet | Gaming |
| dating, match, romantic | Dating |
| shop, store, retail, amazon, ebay | Shopping |
| health, medical, fitness, diet | Health |
| course, learn, training, school | Education |
| hotel, flight, vacation, booking | Travel |
| vpn, antivirus, software, cloud | Utilities |
| movie, music, streaming | Content |

### 4. **category** (Auto-Calculated)
- Simplified version of vertical
- Values: GENERAL, FINANCE, GAMING, DATING, SHOPPING, HEALTH, EDUCATION, TRAVEL, UTILITIES, CONTENT

---

## CSV Format Examples

### Minimal Required Format
(Only title, url, payout, currency are mandatory)
```csv
title,url,payout,currency
"Gaming App X",https://example.com/game,10,USD
"Loan App",https://example.com/loan,25,USD
```

### Complete Format
(All columns with complete data)
```csv
offer_id,title,url,country,payout,description,platform,preview_url,vertical,device,image_url,traffic_sources,expiry,devices,non_access_url,allowed_countries,payout_model,currency,percent
OFF-001,"Gaming App X",https://example.com/game,"US,UK,CA",10,"Casual gaming app",ios,https://example.com/preview,Gaming,mobile,https://example.com/image.jpg,"Push Notifications",2026-12-31,mobile,https://example.com/block,"US,UK,CA",CPA,USD,0
OFF-002,"Finance Loan",https://example.com/loan,US,25,"Quick loan approval",web,https://example.com/preview,Finance,desktop,https://example.com/logo.jpg,Direct,2026-12-31,desktop,https://example.com/block,US,CPL,USD,5
OFF-003,"Shopping Rewards",https://example.com/shop,"US,UK",15,"E-commerce cashback",web,https://example.com/preview,Shopping,desktop,https://example.com/shop.jpg,Direct,2026-12-31,desktop,https://example.com/block,"US,UK",CPC,USD,2
```

### Mixed Format
(Some auto-fill, some manual)
```csv
offer_id,title,url,payout,currency,description,platform,country
OFF-001,"Gaming App X",https://example.com/game,10,USD,"Casual gaming",ios,"US,UK"
OFF-002,"Loan App",https://example.com/loan,25,USD,"Finance app",web,US
OFF-003,"Dating App",https://example.com/dating,5,USD,"Social app",ios,"CA,AU"
```

---

## Duplicate Detection Matching

The system checks for duplicates based on these criteria:

| Criteria | Weight | Method |
|---|---|---|
| **offer_id** (Serial) | 40% | Exact match |
| **title** | 25% | 80% string similarity |
| **description** | 15% | 70% similarity |
| **country** | 10% | Exact match |
| **platform** | 10% | Exact match |
| **payout** | 5% | Within 10% variance |

**Match Threshold**: 60+ points = Duplicate

---

## Import Steps

1. **Download Template**
   - Click "Download Template" button to get a starter CSV

2. **Fill in Data**
   - Use only the columns you have data for
   - System will auto-fill/auto-detect missing values
   - Required: title, url, payout, currency

3. **Upload & Preview**
   - Drag CSV or click to upload
   - System shows preview of all offers
   - Duplicates are highlighted in red

4. **Skip Duplicates (Optional)**
   - Check "Skip Duplicates" to ignore matches
   - Uncheck to import duplicate offers (not recommended)

5. **Click Import**
   - System validates all data
   - Shows success/error count
   - Offers are live immediately

---

## Export & Download

### Export All Offers
- Go to "Missing Offers" tab
- Click "Export" on any report
- Downloads all matched offers as CSV

### Export from Recycle Bin
- Restore offers first
- Then export from main offers list

---

## Validation Rules

All offers must pass these checks:

✅ **Title**: Non-empty required
✅ **URL**: Valid format (https://...)
✅ **Payout**: Numeric value
✅ **Currency**: USD, EUR, INR, or GBP
✅ **Payout Model**: CPA, CPL, CPI, or CPC (if provided)
✅ **Preview URL**: Valid format (if provided)
✅ **Non-Access URL**: Valid format (if provided)

---

## Common Issues

### Issue: "Invalid URL format"
**Solution**: Ensure URLs start with http:// or https://

### Issue: Missing columns detected
**Solution**: Column names are case-insensitive and auto-normalized
- `Offer ID` → `offer_id`
- `TITLE` → `title`
- `Country Name` → `country`

### Issue: "Offer already exists" (Duplicate)
**Solution**: Either skip via checkbox or update the existing offer

### Issue: Data not importing
**Solution**: 
- Check required columns: title, url, payout, currency
- Validate URLs are correct
- Remove special characters from column headers

---

## Tips & Best Practices

✨ **Best Practices**:
1. Always include `offer_id` for tracking and serial number matching
2. Use complete country codes for better filtering (US, UK, CA, AU)
3. Specify `platform` for better targeting (ios, android, web)
4. Add `description` for better duplicate detection
5. Use templated download for consistent format
6. Start with small CSV (5-10 offers) to test
7. Review preview before importing
8. Keep a backup of master offer list

⚠️ **Avoid**:
- Special characters in titles ("@#$%")
- Incomplete URLs
- Inconsistent country codes
- Leaving payout empty
- Using wrong currency codes

---

## Spreadsheet Integration

### If using Google Sheets/Excel:
1. Use the provided template
2. Fill in all columns needed
3. Export as CSV (File → Download → CSV)
4. Upload via bulk import

### Column Order in Template:
```
offer_id → title → url → country → payout → description → 
platform → preview_url → vertical → device → image_url → 
traffic_sources → expiry → devices → non_access_url → 
allowed_countries → payout_model → currency → percent
```

---

## Reference Data

### Valid Currencies
- USD (US Dollar)
- EUR (Euro)
- INR (Indian Rupee)
- GBP (British Pound)

### Valid Payout Models
- CPA (Cost Per Action)
- CPL (Cost Per Lead)
- CPI (Cost Per Install)
- CPC (Cost Per Click)

### Valid Platforms
- ios
- android
- web

### Valid Devices
- mobile
- desktop
- tablet
- all

---

**Last Updated**: February 20, 2026  
**Status**: Production Ready  
**Support**: All 19 columns fully supported
