/**
 * Canonical phone normalization for Brazilian numbers.
 * Treats 'DDD + 9 + 8 digits' and 'DDD + 8 digits' as the same.
 * @param {string} phone - Clean phone number (digits only)
 * @returns {string} - Canonical version (removing '9' from mobile numbers)
 */
function getCanonicalPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');

    // Brazilian numbers: 
    // 11 digits = DDD + 9 + 8 digits (Mobile)
    // 10 digits = DDD + 8 digits (Landline or old Mobile)
    if (clean.length === 11) {
        // Remove the 3rd digit (if it's '9')
        if (clean[2] === '9') {
            return clean.substring(0, 2) + clean.substring(3);
        }
    }

    return clean;
}

module.exports = { getCanonicalPhone };
