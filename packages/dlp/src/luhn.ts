// Luhn algorithm for credit card number validation.

/** Strip non-digit characters and validate via Luhn checksum. */
export function luhnCheck(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;

  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/** Return true if the string looks like a card number AND passes Luhn. */
export function isValidCardNumber(value: string): boolean {
  const digits = value.replace(/[\s\-]/g, "");
  if (!/^\d{13,19}$/.test(digits)) return false;
  return luhnCheck(digits);
}
