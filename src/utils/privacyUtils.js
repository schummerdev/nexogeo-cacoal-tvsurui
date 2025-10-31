// Privacy utility functions for data masking

/**
 * Masks a name to show only the first name and first letter of subsequent names
 * Example: "João da Silva Santos" -> "João S."
 */
export const maskName = (fullName) => {
  if (!fullName || typeof fullName !== 'string') {
    return 'Nome não informado';
  }

  const names = fullName.trim().split(' ');

  if (names.length === 1) {
    return names[0]; // Return single name as is
  }

  // Return first name + first letter of last name
  const firstName = names[0];
  const lastNameInitial = names[names.length - 1].charAt(0).toUpperCase();

  return `${firstName} ${lastNameInitial}.`;
};

/**
 * Masks a phone number to show only the last 4 digits
 * Example: "11987654321" -> "****4321"
 */
export const maskPhone = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return '****';
  }

  const cleanPhone = phone.replace(/\D/g, ''); // Remove non-digits

  if (cleanPhone.length < 4) {
    return '****';
  }

  const lastFourDigits = cleanPhone.slice(-4);
  return `****${lastFourDigits}`;
};

/**
 * Utility function to check if user has admin privileges for showing full data
 */
export const shouldShowFullData = (userRole) => {
  return userRole === 'admin';
};