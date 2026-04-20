/**
 * Formats a mileage number with commas and includes the update date
 * @param mileage - The mileage number to format
 * @param date - The date when mileage was last updated
 * @returns Formatted string like "50,000 as of 03/09/2026"
 */
export function formatMileageWithDate(mileage: number | undefined, date: Date | undefined): string {
  if (mileage === undefined || mileage === null) {
    return 'Not set';
  }

  const formattedMileage = mileage.toLocaleString('en-US');
  
  if (!date) {
    return formattedMileage;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;

  return `${formattedMileage} as of ${formattedDate}`;
}
