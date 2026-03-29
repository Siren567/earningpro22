/**
 * Generates a cryptographically random strong password that satisfies the app's
 * password policy:
 *   - minimum 8 characters (default 16 for comfort)
 *   - at least 1 uppercase letter
 *   - at least 1 lowercase letter
 *   - at least 1 number
 *   - at least 1 special character from !@#$%^&*
 *
 * Uses crypto.getRandomValues for unpredictability (not Math.random).
 */
export function generateStrongPassword(length = 16) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers   = '0123456789';
  const special   = '!@#$%^&*';
  const all       = uppercase + lowercase + numbers + special;

  const rand = (max) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  };

  // Guarantee one of each required type first
  const required = [
    uppercase[rand(uppercase.length)],
    lowercase[rand(lowercase.length)],
    numbers[rand(numbers.length)],
    special[rand(special.length)],
  ];

  // Fill remaining positions from the full character set
  const rest = Array.from({ length: length - required.length }, () => all[rand(all.length)]);

  // Fisher-Yates shuffle so required chars aren't always at the same positions
  const combined = [...required, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}
