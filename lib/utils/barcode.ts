/**
 * Standard GS1 EAN-13 Barcode Utilities
 * Formats 13 digits with country code (894 for Bangladesh) + modulo 10 checksum.
 */
export function generateEAN13Sync(prefix = "89420"): string {
  const randomPart = Math.floor(1000000 + Math.random() * 9000000).toString();
  const raw12 = (prefix + randomPart).slice(0, 12);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return `${raw12}${checksum}`;
}

export function validateEAN13(barcode: string): boolean {
  if (!barcode || barcode.length !== 13 || !/^\d{13}$/.test(barcode)) {
    return false;
  }
  const raw12 = barcode.slice(0, 12);
  const expectedChecksum = parseInt(barcode[12], 10);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const calculatedChecksum = (10 - (sum % 10)) % 10;
  return calculatedChecksum === expectedChecksum;
}
