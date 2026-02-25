// Template download utilities

export const downloadTemplate = async (templateType: string = 'csv'): Promise<void> => {
  const templates = {
    csv: generateCSVTemplate(),
    excel: generateExcelTemplate()
  };
  
  const template = templates[templateType as keyof typeof templates];
  if (!template) {
    throw new Error(`Template type ${templateType} not supported`);
  }
  
  // Create and download the file
  const blob = new Blob([template.content], { type: template.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = template.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const generateCSVTemplate = () => {
  const headers = [
    'title',
    'url', 
    'payout',
    'currency',
    'payout_model',
    'description',
    'countries',
    'platform',
    'device',
    'preview_url',
    'image_url',
    'traffic_sources',
    'vertical',
    'category',
    'devices',
    'expiry_date',
    'non_access_url',
    'percent'
  ];
  
  const sampleRow = [
    'Sample Offer Title',
    'https://example.com/offer',
    '1.50',
    'USD',
    'CPA',
    'Sample description for the offer',
    'US,CA,GB',
    'Web',
    'Desktop',
    'https://example.com/preview',
    'https://example.com/image.jpg',
    'Organic',
    'Web',
    'GENERAL',
    'Desktop',
    '2024-12-31',
    'https://example.com/non-access',
    '0'
  ];
  
  const content = [headers.join(','), sampleRow.join(',')].join('\n');
  
  return {
    content,
    filename: 'offer_template.csv',
    mimeType: 'text/csv'
  };
};

const generateExcelTemplate = () => {
  // For Excel template, we'll return CSV format for now
  // In a real implementation, you might use a library like xlsx
  const csvTemplate = generateCSVTemplate();
  return {
    ...csvTemplate,
    filename: 'offer_template.csv'
  };
};

export const downloadSampleData = async (): Promise<void> => {
  const sampleData = generateSampleOffers();
  const csvContent = convertToCSV(sampleData);
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sample_offers.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const generateSampleOffers = () => {
  return [
    {
      title: 'Mobile Game App Install',
      url: 'https://example.com/game1',
      payout: '2.00',
      currency: 'USD',
      payout_model: 'CPI',
      description: 'Install and play this exciting mobile game',
      countries: 'US,CA,GB',
      platform: 'Mobile',
      device: 'iOS,Android',
      vertical: 'Gaming',
      category: 'Gaming'
    },
    {
      title: 'Finance Survey',
      url: 'https://example.com/survey1',
      payout: '1.50',
      currency: 'USD',
      payout_model: 'CPA',
      description: 'Complete a finance-related survey',
      countries: 'US',
      platform: 'Web',
      device: 'Desktop',
      vertical: 'Finance',
      category: 'FINANCE'
    }
  ];
};

const convertToCSV = (data: any[]): string => {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in values
      const escaped = value.toString().replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};
