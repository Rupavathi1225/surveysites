# Duplicate Detection Update - TODO

## Task
Update duplicate detection to check only 3 criteria: name (title), country, offer_id - ALL must match for duplicate detection.

## Changes Required:

### 1. Update duplicateDetection.ts
- [ ] Modify compareOffers function to check only 3 criteria (remove description check)
- [ ] Update scoring logic to weight 3 criteria equally (33.33% each)
- [ ] Update the strict mode to require ALL 3 criteria to match

### 2. Update AdminOffers.tsx  
- [ ] Update the toast message when duplicates are detected to show "these offers are already loaded, duplicate offers are not allowed"

## Implementation Details:

### Current (4 criteria):
- offer_id (25 points)
- title (25 points)  
- description (25 points)
- country (25 points)
- ALL 4 must match = critical duplicate

### New (3 criteria):
- offer_id (33.33 points)
- title (33.33 points)
- country (33.33 points)
- ALL 3 must match = duplicate

## Status: IN PROGRESS
