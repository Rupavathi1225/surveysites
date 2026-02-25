# Testing API Import Configuration

## Quick Test Setup

### Test Configuration #1 (Using JSONPlaceholder - Free Demo API)

This test uses a free public API to verify your configuration system works:

**Fill in these values:**

```
Provider Name:        "Test Network"
Network Type:         "Custom"
Network ID:           "test-123"
API Endpoint:         "https://jsonplaceholder.typicode.com/posts"
API Key Option:       "Paste Direct API Key"
API Key Value:        "test-key-12345"
Active:               Toggle ON
```

**Then click "Create"**

This creates a test configuration without needing real API credentials.

---

## Test Configuration #2 (Using a Real Network - HasOffers Example)

Ask your manager for these details and fill them in:

```
Provider Name:        "HasOffers Live" (or any name you choose)
Network Type:         "HasOffers" (select from dropdown)
Network ID:           "YOUR_NETWORK_ID" (get from your manager)
API Endpoint:         "https://api.hasoffers.com/v2/Offers.json" (get from your manager)
API Key Option:       Choose ONE:
  - Option A: Paste Direct API Key: "YOUR_API_KEY"
  - Option B: Use Supabase Secret: "HASOFFERS_API_KEY"
Active:               Toggle ON
```

---

## How to Verify It's Working

### Step 1: Click "Configure API"
- Click the "Configure API" button at the top right

### Step 2: Fill in Test Configuration
- Use either test configuration above

### Step 3: Click "Create"
- Should see toast message: "Config created!"

### Step 4: Verify in List
- You should see your new configuration in "API Configurations" section below
- It should show:
  - Provider Name
  - Network Type and Network ID
  - API Endpoint
  - Toggle switch (should be ON)

### Step 5: Test the Preview
- Go back to "Import Offers" section
- Click the dropdown "Choose a provider..."
- Your new configuration should appear in the list
- Select it
- Click "Preview" button
- If API is valid, you'll see offers; if not, you'll see an error

---

## What Each Field Does

| Field | Example | Purpose |
|-------|---------|---------|
| **Provider Name** | "My Network" | Your display name (can be anything) |
| **Network Type** | "HasOffers" | Platform type (dropdown options) |
| **Network ID** | "12345" | Your unique identifier on that platform |
| **API Endpoint** | "https://api.xxx.com/v1/offers" | URL to fetch offers from |
| **API Key** | "abc123xyz" OR "SECRET_NAME" | Authentication credential |

---

## Testing Checklist

- [ ] Can open "Configure API" dialog
- [ ] Can fill all required fields (marked with *)
- [ ] Can click "Create" and see success message
- [ ] Configuration appears in API Configurations list
- [ ] Can select configuration from provider dropdown
- [ ] Preview button is clickable
- [ ] Successful preview shows offers or proper error message

---

## Common Test Scenarios

### ✅ Configuration Created Successfully
- Message: "Config created!"
- Configuration visible in list
- Can select from dropdown

### ✅ Edit Works
- Click settings icon on configuration
- Modify a field
- Click "Update"
- Should see "Config updated!"
- Changes appear in list

### ✅ Toggle Works
- Click the toggle switch on a configuration
- Should turn ON/OFF without errors

### ✅ Delete Works
- Click trash icon on a configuration
- Should see "Config deleted"
- Configuration disappears from list

### ❌ Validation Works
- Try creating without filling required fields
- Should see: "Please fill all required fields"
- Try creating without API Key or Secret Name
- Should see: "Please provide either an API Key or Secret Name"

---

## Example Full Configuration (Real Use)

```
Provider Name:        "Google Surveys US"
Network Type:         "HasOffers"
Network ID:           "us-surveys-001"
API Endpoint:         "https://api.hasoffers.com/v2/Offers.json?affiliate_id=us-surveys-001&api_key=YOUR_KEY"
API Key Option:       "Paste Direct API Key"
API Key:              "abc123def456xyz789"
Active:               ON

Result: When "Preview" is clicked, system will:
1. Call the API endpoint
2. Authenticate with your API key
3. Fetch offers from HasOffers for your network ID
4. Display list of offers
```

---

## Troubleshooting During Testing

**Problem:** Can't see "Configure API" button
- Solution: Scroll to top of page

**Problem:** Can't create configuration
- Solution: Make sure all fields marked with * are filled
- Make sure you selected an API Key method (Secret OR Direct)

**Problem:** Configuration doesn't appear in dropdown
- Solution: 
  1. Verify "Active" toggle is ON
  2. Refresh the page (F5)
  3. Check that configuration was saved

**Problem:** Preview shows no results
- Solution:
  1. Check if API endpoint is correct
  2. Check if API key is valid
  3. Verify Network ID matches what the API expects
  4. Ask your manager to validate the credentials

