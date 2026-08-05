/**
 * DukaPos — Mobile & Tablet UI Formatters
 * Formats long industry module names and branch names for mobile viewports.
 */

export function getShortModuleName(name: string): string {
  if (!name) return 'Retail';
  const n = name.trim();
  if (n === 'BusinessConsultant' || n === 'Business Consultant') return 'Consulting';
  if (n === 'Restaurant & Lounge' || n === 'Restaurant') return 'Resto/Bar';
  if (n === 'Pharmacy & Health' || n === 'Pharmacy') return 'Pharmacy';
  if (n === 'Poultry & Livestock' || n === 'Poultry') return 'Poultry';
  if (n === 'Salon & Spa' || n === 'Salon') return 'Salon';
  if (n === 'Microfinance & Credit') return 'Microfinance';
  if (n === 'RealEstate') return 'Real Estate';
  if (n === 'FuelStation') return 'Fuel Station';
  return n;
}

export function getShortBranchName(name: string): string {
  if (!name) return 'Main';
  const clean = name
    .replace(/Tanzania\s*/gi, '')
    .replace(/Branch\s*/gi, '')
    .replace(/Outlet\s*/gi, '')
    .trim();
  if (clean.length > 12) {
    return clean.slice(0, 10) + '…';
  }
  return clean || name;
}
