# TODO: AdminOffers Features Implementation

## Task Summary:
1. All offers should be stored in "offers" section (new section) - where we can decide which offer goes to which tab
   - If active: visible in offers gallery (user dashboard)
   - If inactive: not visible in offers gallery

2. Copy 50 offers - add dropdown while copying: 50, 100, 150, 200

3. Export as CSV - add to all tabs in offers section

## Implementation Progress:

### Completed:
- [x] Updated tabs to include "All Offers" tab (8 columns instead of 7)

### Pending:
- [ ] Add "All Offers" tab content (TabsContent value="offers")
- [ ] Add export functions:
  - exportActiveOffers
  - exportInactiveOffers  
  - exportBoostedOffers
  - exportDuplicatesOffers
  - exportRecycleBinOffers
- [ ] Add Export CSV buttons to:
  - [x] Active tab
  - [x] Inactive tab
  - [x] Boosted tab
  - [ ] Duplicates tab
  - [ ] Recycle Bin tab
- [ ] Add copy dropdown with options: 10, 25, 50, 100, 150, 200

### Functions to Add:
```
const exportActiveOffers = () => {
  const activeData = items.filter(o => o.status === 'active');
  exportToCsv(activeData, `active_offers_${new Date().toISOString().split('T')[0]}.csv`);
};

const exportInactiveOffers = () => {
  const inactiveData = items.filter(o => o.status === 'inactive');
  exportToCsv(inactiveData, `inactive_offers_${new Date().toISOString().split('T')[0]}.csv`);
};

const exportBoostedOffers = () => {
  const boostedData = items.filter(o => o.percent && o.percent > 0);
  exportToCsv(boostedData, `boosted_offers_${new Date().toISOString().split('T')[0]}.csv`);
};
