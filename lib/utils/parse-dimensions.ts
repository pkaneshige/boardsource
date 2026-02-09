export interface ParsedDimensions {
  lengthFeet: number;
  lengthInches: number;
  widthInches: number | null;
  thicknessInches: number | null;
}

/**
 * Parse a fractional inch string like "20 13/16" into a decimal number (20.8125).
 * Also handles plain decimals like "19.5" and whole numbers like "20".
 */
function parseFractionalInches(str: string): number | null {
  const trimmed = str.trim();
  if (!trimmed) return null;

  // Match "whole fraction" like "20 13/16" or just "13/16"
  const fractionMatch = trimmed.match(
    /^(\d+)?\s*(\d+)\/(\d+)$/
  );
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1], 10) : 0;
    const num = parseInt(fractionMatch[2], 10);
    const den = parseInt(fractionMatch[3], 10);
    if (den === 0) return null;
    return whole + num / den;
  }

  // Plain decimal or integer like "19.5" or "20"
  const val = parseFloat(trimmed);
  return isNaN(val) ? null : val;
}

/**
 * Parse a dimension string like "5'8 x 20 13/16 x 2 1/4" into structured numeric values.
 * Returns null if the string cannot be parsed at all.
 */
export function parseDimensionString(
  dimensions: string
): ParsedDimensions | null {
  if (!dimensions || !dimensions.trim()) return null;

  const input = dimensions.trim();

  // Try full dimensions with 'x' separator: "5'8 x 20 13/16 x 2 1/4"
  // Captures: feet, inches-part, width-part, thickness-part
  const fullMatch = input.match(
    /(\d+)[''′]\s*(\d+(?:\s+\d+\/\d+)?)?[""″]?\s*[xX]\s*([\d\s/\.]+?)\s*[xX]\s*([\d\s/\.]+)/
  );
  if (fullMatch) {
    const feet = parseInt(fullMatch[1], 10);
    const inches = fullMatch[2] ? parseFractionalInches(fullMatch[2]) ?? 0 : 0;
    const width = parseFractionalInches(fullMatch[3]);
    const thickness = parseFractionalInches(fullMatch[4]);
    return { lengthFeet: feet, lengthInches: inches, widthInches: width, thicknessInches: thickness };
  }

  // Try length with 'x' but only two parts: "5'8 x 20 13/16"
  const twoPartMatch = input.match(
    /(\d+)[''′]\s*(\d+(?:\s+\d+\/\d+)?)?[""″]?\s*[xX]\s*([\d\s/\.]+)/
  );
  if (twoPartMatch) {
    const feet = parseInt(twoPartMatch[1], 10);
    const inches = twoPartMatch[2] ? parseFractionalInches(twoPartMatch[2]) ?? 0 : 0;
    const width = parseFractionalInches(twoPartMatch[3]);
    return { lengthFeet: feet, lengthInches: inches, widthInches: width, thicknessInches: null };
  }

  // Try feet-inches with prime notation: "5'8", "5'8\"", "5'10 1/2"
  const primeMatch = input.match(
    /(\d+)[''′]\s*(\d+(?:\s+\d+\/\d+)?)?[""″]?/
  );
  if (primeMatch) {
    const feet = parseInt(primeMatch[1], 10);
    const inches = primeMatch[2] ? parseFractionalInches(primeMatch[2]) ?? 0 : 0;
    return { lengthFeet: feet, lengthInches: inches, widthInches: null, thicknessInches: null };
  }

  // Try spelled-out format: "5ft 8in"
  const ftMatch = input.match(/(\d+)\s*ft\s*(\d+(?:\s+\d+\/\d+)?)?\s*(?:in)?/i);
  if (ftMatch) {
    const feet = parseInt(ftMatch[1], 10);
    const inches = ftMatch[2] ? parseFractionalInches(ftMatch[2]) ?? 0 : 0;
    return { lengthFeet: feet, lengthInches: inches, widthInches: null, thicknessInches: null };
  }

  // Try dash separator: "5-8" (5 feet 8 inches)
  const dashMatch = input.match(/\b(\d+)-(\d{1,2})\b/);
  if (dashMatch) {
    const feet = parseInt(dashMatch[1], 10);
    const inches = parseInt(dashMatch[2], 10);
    if (feet >= 4 && feet <= 12 && inches >= 0 && inches <= 11) {
      return { lengthFeet: feet, lengthInches: inches, widthInches: null, thicknessInches: null };
    }
  }

  return null;
}

/**
 * Parse a volume string like "28.8", "28.8L", "V28.8", or "volume: 28.8" into a number.
 * Returns null if unparseable.
 */
export function parseVolumeString(volume: string): number | null {
  if (!volume || !volume.trim()) return null;

  const input = volume.trim();

  // Try "V28.8" or "v28.8"
  const vPrefixMatch = input.match(/[Vv](\d+(?:\.\d+)?)/);
  if (vPrefixMatch) {
    return parseFloat(vPrefixMatch[1]);
  }

  // Try "volume: 28.8" or "Volume 28.8"
  const volumeLabelMatch = input.match(
    /[Vv](?:olume)?[:\s]+(\d+(?:\.\d+)?)/
  );
  if (volumeLabelMatch) {
    return parseFloat(volumeLabelMatch[1]);
  }

  // Try "28.8L", "28.8 liters", "28.8 litres"
  const literMatch = input.match(
    /(\d+(?:\.\d+)?)\s*[Ll](?:iters?|itres?)?/
  );
  if (literMatch) {
    return parseFloat(literMatch[1]);
  }

  // Try plain number "28.8"
  const plainMatch = input.match(/^(\d+(?:\.\d+)?)\s*$/);
  if (plainMatch) {
    return parseFloat(plainMatch[1]);
  }

  return null;
}
