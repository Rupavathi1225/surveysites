# Bulk Upload CSV Examples - Visual Guide

## Column Display in Spreadsheet

Here's how all 19 columns should be organized in your CSV/spreadsheet:

```
┌──────────┬─────────────┬─────────────────┬─────────┬────────┬──────────────────┬──────────┬──────────────────┬──────────┬─────────┬───────────────────────────────────────┐
│ offer_id │ title       │ url             │ country │ payout │ description      │ platform │ preview_url      │ vertical │ device  │ image_url                             │
├──────────┼─────────────┼─────────────────┼─────────┼────────┼──────────────────┼──────────┼──────────────────┼──────────┼─────────┼───────────────────────────────────────┤
│ OFF-001  │ Gaming App X│ https://ex.../g │ US,UK  │ 10     │ Casual gaming    │ ios      │ https://ex.../pr │ Gaming   │ mobile  │ https://api.dicebear.com/.../gaming   │
│ OFF-002  │ Finance Loan│ https://ex.../l │ US     │ 25     │ Quick loan       │ web      │ https://ex.../pr │ Finance  │ desktop │ https://api.dicebear.com/.../finance  │
│ OFF-003  │ Shopping    │ https://ex.../s │ US,UK  │ 15     │ E-commerce       │ web      │ https://ex.../pr │ Shopping │ desktop │ https://api.dicebear.com/.../shopping │
└──────────┴─────────────┴─────────────────┴─────────┴────────┴──────────────────┴──────────┴──────────────────┴──────────┴─────────┴───────────────────────────────────────┘

┌───────────────────────────┬──────────┬────────────┬─────────┬──────────────────┬───────────────────┬──────────────┬──────────┬─────────┐
│ traffic_sources           │ expiry   │ devices    │ percent │ non_access_url   │ allowed_countries │ payout_model │ currency │ status  │
├───────────────────────────┼──────────┼────────────┼─────────┼──────────────────┼───────────────────┼──────────────┼──────────┼─────────┤
│ Push Notifications        │ 2026-... │ mobile     │ 0       │ https://ex.../b  │ US,UK,CA          │ CPA          │ USD      │ active  │
│ Direct                    │ 2026-... │ desktop    │ 5       │ https://ex.../b  │ US                │ CPL          │ USD      │ active  │
│ Social Media              │ 2026-... │ desktop    │ 2       │ https://ex.../b  │ US,UK,AU          │ CPC          │ USD      │ active  │
└───────────────────────────┴──────────┴────────────┴─────────┴──────────────────┴───────────────────┴──────────────┴──────────┴─────────┘
```

---

## Real Example - 5 Sample Offers

### Complete CSV Format (All Columns)

```csv
offer_id,title,url,country,payout,description,platform,preview_url,vertical,device,image_url,traffic_sources,expiry,devices,non_access_url,allowed_countries,payout_model,currency,percent
OFF-001,"Gaming App X","https://example.com/game","US,UK,CA",10,"Casual gaming app with daily rewards and tournaments","ios","https://example.com/game/preview?ref=admin","Gaming","mobile","https://api.dicebear.com/7.x/icons/svg?seed=gaming","Push Notifications","2026-12-31","mobile","https://example.com/game/notfound","US,UK,CA","CPA","USD",0
OFF-002,"Finance Loan App","https://example.com/loan","US",25,"Quick personal loan approval in minutes, up to $50000","web","https://example.com/loan/preview?ref=admin","Finance","desktop","https://api.dicebear.com/7.x/icons/svg?seed=finance","Direct","2026-12-31","desktop","https://example.com/loan/notfound","US","CPL","USD",5
OFF-003,"Shopping Reward","https://example.com/shop","US,UK,AU",15,"Earn cashback on every purchase at major retailers","web","https://example.com/shop/preview?ref=admin","Shopping","desktop","https://api.dicebear.com/7.x/icons/svg?seed=shopping","Direct","2026-12-31","desktop","https://example.com/shop/notfound","US,UK,AU,NZ","CPC","USD",2
OFF-004,"Dating App Pro","https://example.com/date","CA,AU",8,"Premium dating app with AI matching","ios,android","https://example.com/date/preview?ref=admin","Dating","mobile","https://api.dicebear.com/7.x/icons/svg?seed=dating","Social Media","2026-12-31","mobile","https://example.com/date/notfound","CA,AU,NZ","CPA","USD",0
OFF-005,"Health Fitness App","https://example.com/fitness","US,UK,CA",12,"Personal fitness tracking with AI coach","ios,android","https://example.com/fitness/preview?ref=admin","Health","mobile","https://api.dicebear.com/7.x/icons/svg?seed=health","Push Notifications","2026-12-31","mobile","https://example.com/fitness/notfound","US,UK,CA","CPA","USD",3
```

---

### Minimal Required Format (Only Essentials)

```csv
offer_id,title,url,payout,currency,description,country
OFF-001,"Gaming App X","https://example.com/game",10,USD,"Casual gaming",US
OFF-002,"Finance Loan","https://example.com/loan",25,USD,"Quick loan",US
OFF-003,"Shopping Deal","https://example.com/shop",15,USD,"Cashback",US,UK
OFF-004,"Dating App","https://example.com/date",8,USD,"Dating",CA
OFF-005,"Fitness App","https://example.com/fitness",12,USD,"Fitness tracker",US
```

---

### Mixed Format (Partial Data - Rest Auto-Filled)

```csv
offer_id,title,url,payout,currency,platform,country,description
OFF-001,"Gaming App X","https://example.com/game",10,USD,ios,"US,UK",Gaming app
OFF-002,"Finance Loan","https://example.com/loan",25,USD,web,US,Loan app
OFF-003,"Shopping Reward","https://example.com/shop",15,USD,web,"US,UK",Shop rewards
OFF-004,"Dating Pro","https://example.com/date",8,USD,"ios,android",CA,Dating app
OFF-005,"Health Tracker","https://example.com/fitness",12,USD,"ios,android",US,Fitness app
```

---

## Excel/Google Sheets Template

### Step 1: Column Headers (Row 1)
```
A              B              C                    D           E       F                G         H                   I          J         K                 L                  M          N          O                    P                 Q             R         S
offer_id       title          url                  country     payout  description      platform  preview_url         vertical   device    image_url         traffic_sources    expiry     devices    non_access_url     allowed_countries payout_model currency percent
```

### Step 2: Add Data Row by Row

**Row 2 (Gaming Offer)**
```
A2: OFF-001
B2: Gaming App X
C2: https://example.com/game
D2: US,UK,CA
E2: 10
F2: Casual gaming with daily rewards
G2: ios
H2: https://example.com/game/preview
I2: Gaming          (leave blank to auto-detect)
J2: mobile         (leave blank to auto-fit)
K2: [leave blank]  (auto-generates image)
L2: [leave blank]  (auto-detects: Push Notifications)
M2: 2026-12-31
N2: mobile
O2: https://example.com/game/block
P2: US,UK,CA
Q2: CPA
R2: USD
S2: 0
```

**Row 3 (Finance Offer)**
```
A3: OFF-002
B3: Finance Loan App
C3: https://example.com/loan
D3: US
E3: 25
F3: Quick loan approval
G3: web
H3: https://example.com/loan/preview
I3: Finance        (leave blank to auto-detect)
J3: desktop        (leave blank to auto-fit)
K3: [leave blank]  (auto-generates image)
L3: [leave blank]  (auto-detects: Direct)
M3: 2026-12-31
N3: desktop
O3: https://example.com/loan/block
P3: US
Q3: CPL
R3: USD
S3: 5
```

---

## Google Sheets Setup Guide

### 1. Create New Sheet
```
File → New → Spreadsheet → Name: "Bulk Offers Import"
```

### 2. Paste Headers
Copy and paste this row to A1:
```
offer_id	title	url	country	payout	description	platform	preview_url	vertical	device	image_url	traffic_sources	expiry	devices	non_access_url	allowed_countries	payout_model	currency	percent
```

### 3. Fill Data (Rows 2+)
- Enter offers rowwise
- Leave auto-fill columns blank to auto-generate
- Save when done

### 4. Download as CSV
```
File → Download → Comma Separated Values (.csv)
```

### 5. Upload to Bulk Import
- Go to Offers → Bulk Upload
- Drop and upload the CSV
- Review preview
- Click Import

---

## Field Colors/Highlighting Guide

When creating your spreadsheet, you can color-code columns:

| Color | Column Types | Example Columns |
|---|---|---|
| 🔴 **Red** | Required | title, url, payout, currency |
| 🟡 **Yellow** | Highly Recommended | offer_id, description, country, platform |
| 🟢 **Green** | Auto-Fill Available | image_url, traffic_sources, vertical, category |
| ⚪ **Gray** | Optional | expiry, percent, non_access_url |

---

## Word/LibreOffice Table Example

Create a table with these columns:

| offer_id | title | url | country | payout | description | platform | preview_url | vertical | device | image_url | traffic_sources | expiry | devices | non_access_url | allowed_countries | payout_model | currency | percent |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OFF-001 | Gaming App X | https://... | US,UK | 10 | Gaming app | ios | https://... | Gaming | mobile | [auto] | [auto] | 2026-12-31 | mobile | https://... | US,UK | CPA | USD | 0 |
| OFF-002 | Loan App | https://... | US | 25 | Finance | web | https://... | Finance | desktop | [auto] | [auto] | 2026-12-31 | desktop | https://... | US | CPL | USD | 5 |

Save as `.csv` and upload.

---

## Tips for Large Imports (100+ offers)

1. **Split into Batches**
   - Import 100 offers at a time
   - Monitor success rates

2. **Use Templates**
   - Download template for consistent format
   - Fill programmatically if possible

3. **Validate Before Upload**
   - Check for empty required columns
   - Verify URLs are valid
   - Ensure no duplicate offer_ids

4. **Monitor Duplicates**
   - First import: 50 offers
   - Check duplicates found
   - Adjust skip setting if needed
   - Continue with remaining offers

5. **Keep Backups**
   - Save original CSV files
   - Export existing offers before bulk changes
   - Use recycle bin for test offers

---

## Common Column Combinations

### For Gaming Offers
```csv
offer_id,title,url,payout,currency,description,platform,country,vertical,device
OFF-GAME-001,Casino X,https://...,10,USD,Casino with 1000+ games,ios,US,Gaming,mobile
```

### For Finance Offers
```csv
offer_id,title,url,payout,currency,description,platform,country,vertical,payout_model
OFF-FIN-001,Loan App,https://...,25,USD,Quick loan,web,US,Finance,CPL
```

### For Dating Offers
```csv
offer_id,title,url,payout,currency,description,platform,country,vertical,traffic_sources
OFF-DATE-001,Dating Pro,https://...,8,USD,Premium dating,ios,CA,Dating,Social Media
```

### For Shopping Offers
```csv
offer_id,title,url,payout,currency,description,platform,country,vertical,payout_model
OFF-SHOP-001,Cashback,https://...,15,USD,Store rewards,web,US,Shopping,CPC
```

---

**Generated**: February 20, 2026  
**Format**: Production Ready  
**All 19 columns supported and documented**
