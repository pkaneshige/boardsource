/**
 * Unit tests for duplicate-detector.ts
 *
 * Run with: npx tsx lib/scraper/__tests__/duplicate-detector.test.ts
 */

import {
  normalizeDimensions,
  NormalizedDimensions,
  extractBrand,
  extractModel,
  extractProductSignature,
  compareSignatures,
  ProductSignature,
  findDuplicates,
  logMatchDetails,
} from "../duplicate-detector";
import type { Surfboard } from "@/types";
import { DUPLICATE_TEST_CASES } from "./duplicate-test-cases";

interface TestCase {
  input: string;
  expected: NormalizedDimensions | null;
  description: string;
}

const testCases: TestCase[] = [
  // Standard formats with prime marks
  {
    input: "5'8",
    expected: { lengthInches: 68, original: "5'8" },
    description: "Feet and inches with single prime mark",
  },
  {
    input: "5'8\"",
    expected: { lengthInches: 68, original: "5'8\"" },
    description: "Feet and inches with prime and double prime marks",
  },
  {
    input: "6'0",
    expected: { lengthInches: 72, original: "6'0" },
    description: "Six feet even",
  },
  {
    input: "5'",
    expected: { lengthInches: 60, original: "5'" },
    description: "Just feet with prime mark",
  },

  // Spelled out format
  {
    input: "5ft 8in",
    expected: { lengthInches: 68, original: "5ft 8in" },
    description: "Spelled out feet and inches",
  },
  {
    input: "5 ft 8 in",
    expected: { lengthInches: 68, original: "5 ft 8 in" },
    description: "Spelled out with spaces",
  },
  {
    input: "6ft",
    expected: { lengthInches: 72, original: "6ft" },
    description: "Just feet spelled out",
  },

  // Dash format
  {
    input: "5-8",
    expected: { lengthInches: 68, original: "5-8" },
    description: "Dash separator format",
  },
  {
    input: "6-0",
    expected: { lengthInches: 72, original: "6-0" },
    description: "Dash separator six feet even",
  },
  {
    input: "5-10",
    expected: { lengthInches: 70, original: "5-10" },
    description: "Dash separator five ten",
  },

  // Full dimensions (extract just length)
  {
    input: "5'8 x 19.5 x 2.5",
    expected: { lengthInches: 68, original: "5'8 x 19.5 x 2.5" },
    description: "Full dimensions with decimal width/thickness",
  },
  {
    input: "5'8\" x 20 1/4 x 2 1/2",
    expected: { lengthInches: 68, original: "5'8\" x 20 1/4 x 2 1/2" },
    description: "Full dimensions with fractions",
  },
  {
    input: "6'0 x 19 x 2.25",
    expected: { lengthInches: 72, original: "6'0 x 19 x 2.25" },
    description: "Full dimensions six feet",
  },

  // With fractions in the length
  {
    input: "5'8 1/2",
    expected: { lengthInches: 68.5, original: "5'8 1/2" },
    description: "Feet and inches with fraction",
  },
  {
    input: "5'10 1/4",
    expected: { lengthInches: 70.25, original: "5'10 1/4" },
    description: "Feet and inches with quarter fraction",
  },
  {
    input: "6'2 3/4\"",
    expected: { lengthInches: 74.75, original: "6'2 3/4\"" },
    description: "Feet and inches with three-quarter fraction",
  },

  // Edge cases that should return null
  {
    input: "",
    expected: null,
    description: "Empty string",
  },
  {
    input: "   ",
    expected: null,
    description: "Whitespace only",
  },
  {
    input: "abc",
    expected: null,
    description: "Non-numeric string",
  },
  {
    input: "123",
    expected: null,
    description: "Number without feet/inch indicator",
  },

  // Real examples from test cases
  {
    input: "5'8 x 20 1/4 x 2 1/2",
    expected: { lengthInches: 68, original: "5'8 x 20 1/4 x 2 1/2" },
    description: "Hawaiian South Shore format with fractions",
  },
  {
    input: "5'10 x 20 3/4 x 2 5/8",
    expected: { lengthInches: 70, original: "5'10 x 20 3/4 x 2 5/8" },
    description: "Hawaiian South Shore format 5'10",
  },
  {
    input: "5'6 x 20 x 2.35",
    expected: { lengthInches: 66, original: "5'6 x 20 x 2.35" },
    description: "Hawaiian South Shore format with decimal thickness",
  },
  {
    input: "5'11 x 18 7/8 x 2 3/8",
    expected: { lengthInches: 71, original: "5'11 x 18 7/8 x 2 3/8" },
    description: "Hawaiian South Shore format 5'11",
  },
  {
    input: "5'6\" x 20.5 x 2.65",
    expected: { lengthInches: 66, original: "5'6\" x 20.5 x 2.65" },
    description: "Hawaiian South Shore format with quote mark",
  },
];

function runTests(): void {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("Running normalizeDimensions tests...\n");

  for (const testCase of testCases) {
    const result = normalizeDimensions(testCase.input);
    const isEqual =
      (result === null && testCase.expected === null) ||
      (result !== null &&
        testCase.expected !== null &&
        result.lengthInches === testCase.expected.lengthInches &&
        result.original === testCase.expected.original);

    if (isEqual) {
      passed++;
      console.log(`✓ ${testCase.description}`);
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Input: "${testCase.input}"
    Expected: ${JSON.stringify(testCase.expected)}
    Got: ${JSON.stringify(result)}`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    failures.forEach((f) => console.log(f));
    process.exit(1);
  }

  console.log("\nAll tests passed!");
}

// ============================================================================
// extractBrand tests
// ============================================================================

interface BrandTestCase {
  input: string;
  expected: string | null;
  description: string;
}

const brandTestCases: BrandTestCase[] = [
  // Brand at start of name
  {
    input: "Firewire Seaside 5'8\"",
    expected: "firewire",
    description: "Brand at start - Firewire",
  },
  {
    input: "Channel Islands Fishbeard 5'10\"",
    expected: "channel islands",
    description: "Brand at start - Channel Islands",
  },
  {
    input: "Pyzel Phantom 6'0 x 19 1/4 x 2 7/16 - White",
    expected: "pyzel",
    description: "Brand at start - Pyzel with dimensions",
  },
  {
    input: "Lost Mayhem Puddle Jumper HP 5'6 x 20 x 2.35",
    expected: "lost",
    description: "Brand at start - Lost with sub-brand",
  },

  // Abbreviations that map to canonical names
  {
    input: "CI Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II",
    expected: "channel islands",
    description: "CI abbreviation maps to Channel Islands",
  },
  {
    input: "JS Monsta Box 2020 5'10 X 19 1/8 X 2 3/8\"",
    expected: "js industries",
    description: "JS abbreviation maps to JS Industries",
  },

  // Brand in middle of name
  {
    input: "Used Firewire Seaside 5'8\"",
    expected: "firewire",
    description: "Brand in middle - after 'Used'",
  },
  {
    input: "Pre-Owned Channel Islands Fishbeard",
    expected: "channel islands",
    description: "Brand in middle - after 'Pre-Owned'",
  },

  // Brand at end of name
  {
    input: "Seaside 5'8\" by Firewire",
    expected: "firewire",
    description: "Brand at end - after 'by'",
  },

  // Multi-word brands
  {
    input: "Chris Christenson Fish 5'10\"",
    expected: "chris christenson",
    description: "Multi-word brand - Chris Christenson",
  },
  {
    input: "Hawaiian Pro Designs Liddle 9'0\"",
    expected: "hawaiian pro designs",
    description: "Multi-word brand - Hawaiian Pro Designs",
  },
  {
    input: "Donald Takayama DT-2 9'6\"",
    expected: "donald takayama",
    description: "Multi-word brand - Donald Takayama",
  },

  // All specified brands
  {
    input: "DHD MF DNA 5'11\"",
    expected: "dhd",
    description: "Brand - DHD",
  },
  {
    input: "Haydenshapes Hypto Krypto 5'10\"",
    expected: "haydenshapes",
    description: "Brand - Haydenshapes",
  },
  {
    input: "Album Disasym 5'6\"",
    expected: "album",
    description: "Brand - Album",
  },
  {
    input: "Torq Mod Fish 6'6\"",
    expected: "torq",
    description: "Brand - Torq",
  },
  {
    input: "Bing Elevator 9'4\"",
    expected: "bing",
    description: "Brand - Bing",
  },

  // No brand found
  {
    input: "Custom Surfboard 6'0\"",
    expected: null,
    description: "No known brand - generic name",
  },
  {
    input: "Vintage 1970s Single Fin",
    expected: null,
    description: "No known brand - vintage board",
  },
  {
    input: "",
    expected: null,
    description: "Empty string",
  },
  {
    input: "   ",
    expected: null,
    description: "Whitespace only",
  },

  // Case insensitivity
  {
    input: "FIREWIRE SEASIDE 5'8\"",
    expected: "firewire",
    description: "Case insensitive - all caps",
  },
  {
    input: "channel islands Fishbeard",
    expected: "channel islands",
    description: "Case insensitive - all lowercase",
  },

  // Real examples from test cases
  {
    input: "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
    expected: "firewire",
    description: "Real example - Hawaiian South Shore format",
  },
  {
    input: "JS Industries Monsta Box 5-10",
    expected: "js industries",
    description: "Real example - Surf Garage format",
  },
  {
    input: "Album Surfboards Disasym Fish 5'6\"",
    expected: "album",
    description: "Real example - Album with 'Surfboards' suffix",
  },
];

function runBrandTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running extractBrand tests...\n");

  for (const testCase of brandTestCases) {
    const result = extractBrand(testCase.input);
    const isEqual = result === testCase.expected;

    if (isEqual) {
      passed++;
      console.log(`✓ ${testCase.description}`);
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Input: "${testCase.input}"
    Expected: ${JSON.stringify(testCase.expected)}
    Got: ${JSON.stringify(result)}`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `extractBrand: ${passed} passed, ${failed} failed out of ${brandTestCases.length} tests`
  );

  return { passed, failed, failures };
}

// ============================================================================
// extractModel tests
// ============================================================================

interface ModelTestCase {
  input: string;
  brand?: string | null;
  expected: string;
  description: string;
}

const modelTestCases: ModelTestCase[] = [
  // Basic model extraction with brand removal
  {
    input: "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
    expected: "seaside",
    description: "Firewire Seaside with dimensions and tech name",
  },
  {
    input: "CI Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II",
    expected: "fishbeard",
    description: "CI Fishbeard with dimensions and fin system",
  },
  {
    input: "Lost Mayhem Puddle Jumper HP 5'6 x 20 x 2.35",
    expected: "mayhem puddle jumper hp",
    description: "Lost with Mayhem sub-brand and model variant",
  },
  {
    input: "Pyzel Phantom 6'0 x 19 1/4 x 2 7/16 - White",
    expected: "phantom",
    description: "Pyzel Phantom with color",
  },
  {
    input: "Haydenshapes Hypto Krypto 5'10 FutureFlex FF - Blue",
    expected: "hypto krypto",
    description: "Haydenshapes with tech names and color",
  },

  // With explicit brand parameter
  {
    input: "Firewire Seaside 5'8\"",
    brand: "firewire",
    expected: "seaside",
    description: "With explicit brand parameter",
  },
  {
    input: "Channel Islands Fishbeard 5-10",
    brand: "channel islands",
    expected: "fishbeard",
    description: "Multi-word brand removal",
  },

  // Model names that contain common words
  {
    input: "JS Monsta Box 2020 5'10 X 19 1/8 X 2 3/8\"",
    expected: "monsta box",
    description: "JS Monsta Box with year in name",
  },
  {
    input: "DHD MF DNA 5'11 x 18 7/8 x 2 3/8 - 27.5L",
    expected: "mf dna",
    description: "DHD with initials and volume",
  },
  {
    input: "Album Disasym 5'6\" x 20.5 x 2.65 - Clear",
    expected: "disasym",
    description: "Album Disasym with decimal dimensions",
  },

  // Surf Garage formats
  {
    input: "Firewire Seaside 5'8\" Surfboard",
    expected: "seaside",
    description: "Surf Garage format with 'Surfboard' suffix",
  },
  {
    input: "JS Industries Monsta Box 5-10",
    expected: "monsta box",
    description: "Surf Garage format with full brand name",
  },
  {
    input: "Album Surfboards Disasym Fish 5'6\"",
    expected: "disasym fish",
    description: "Surf Garage with 'Surfboards' in brand and category",
  },
  {
    input: "DHD DNA 5'11\" Futures",
    expected: "dna",
    description: "Surf Garage with fin system suffix",
  },

  // Common model names that should be preserved
  {
    input: "Firewire Machado Seaside 5'8\"",
    expected: "machado seaside",
    description: "Preserve shaper name (Machado) in model",
  },
  {
    input: "Firewire Machado Sunday 5'8\"",
    expected: "machado sunday",
    description: "Preserve shaper name for different model",
  },
  {
    input: "Channel Islands Neck Beard 2 5'10\"",
    expected: "neck beard 2",
    description: "Model with version number",
  },
  {
    input: "Lost Puddle Jumper HP 5'6\"",
    expected: "puddle jumper hp",
    description: "Model with HP variant designation",
  },

  // Edge cases
  {
    input: "",
    expected: "",
    description: "Empty string",
  },
  {
    input: "   ",
    expected: "",
    description: "Whitespace only",
  },
  {
    input: "Custom Board 6'0\"",
    expected: "custom",
    description: "Unknown brand with 'Board' suffix removed",
  },

  // Real-world challenging cases
  {
    input: "Pyzel Ghost Pro 5'11 x 19 1/4 x 2 3/8 FCS II - Carbon",
    expected: "ghost pro",
    description: "Pyzel Ghost Pro with carbon finish",
  },
  {
    input: "Chris Christenson Fish 5'10 - Resin Tint",
    expected: "fish",
    description: "Chris Christenson with resin tint",
  },
  {
    input: "Torq Mod Fish 6'6 - Bamboo",
    expected: "mod fish",
    description: "Torq Mod Fish with bamboo finish",
  },
  {
    input: "Bing Elevator 9'4\" - White/Blue",
    expected: "elevator",
    description: "Bing longboard with two-tone color",
  },
  {
    input: "Hawaiian Pro Designs Liddle 9'0\"",
    expected: "liddle",
    description: "Multi-word brand (Hawaiian Pro Designs)",
  },
  {
    input: "Donald Takayama DT-2 9'6\"",
    expected: "dt 2",
    description: "Donald Takayama model with hyphenated number",
  },

  // Test various dimension formats are removed
  {
    input: "Firewire Seaside 5'8",
    expected: "seaside",
    description: "Dimension without inch mark",
  },
  {
    input: "Firewire Seaside 5'8 1/2",
    expected: "seaside",
    description: "Dimension with fraction",
  },
  {
    input: "Lost Puddle Jumper 5-6 Thruster",
    expected: "puddle jumper",
    description: "Dash format dimension and fin config",
  },
];

function runModelTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running extractModel tests...\n");

  for (const testCase of modelTestCases) {
    const result = extractModel(testCase.input, testCase.brand);
    const isEqual = result === testCase.expected;

    if (isEqual) {
      passed++;
      console.log(`✓ ${testCase.description}`);
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Input: "${testCase.input}"
    Brand: ${JSON.stringify(testCase.brand)}
    Expected: "${testCase.expected}"
    Got: "${result}"`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `extractModel: ${passed} passed, ${failed} failed out of ${modelTestCases.length} tests`
  );

  return { passed, failed, failures };
}

// ============================================================================
// extractProductSignature tests
// ============================================================================

interface SignatureTestCase {
  input: string;
  source: string;
  expected: ProductSignature;
  description: string;
}

const signatureTestCases: SignatureTestCase[] = [
  // Hawaiian South Shore formats
  {
    input: "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
    source: "hawaiian-south-shore",
    expected: {
      brand: "firewire",
      model: "seaside",
      lengthInches: 68,
      source: "hawaiian-south-shore",
    },
    description: "HSS format - Firewire Seaside with full dimensions",
  },
  {
    input: "Channel Islands Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II",
    source: "hawaiian-south-shore",
    expected: {
      brand: "channel islands",
      model: "fishbeard",
      lengthInches: 70,
      source: "hawaiian-south-shore",
    },
    description: "HSS format - CI Fishbeard",
  },
  {
    input: "Lost Mayhem Puddle Jumper HP 5'6 x 20 x 2.35",
    source: "hawaiian-south-shore",
    expected: {
      brand: "lost",
      model: "mayhem puddle jumper hp",
      lengthInches: 66,
      source: "hawaiian-south-shore",
    },
    description: "HSS format - Lost with sub-brand",
  },

  // Surf Garage formats
  {
    input: "Firewire Seaside 5'8\" Surfboard",
    source: "surfgarage",
    expected: {
      brand: "firewire",
      model: "seaside",
      lengthInches: 68,
      source: "surfgarage",
    },
    description: "SG format - Firewire Seaside",
  },
  {
    input: "JS Industries Monsta Box 5-10",
    source: "surfgarage",
    expected: {
      brand: "js industries",
      model: "monsta box",
      lengthInches: 70,
      source: "surfgarage",
    },
    description: "SG format - JS Monsta Box with dash dimensions",
  },
  {
    input: "DHD DNA 5'11\" Futures",
    source: "surfgarage",
    expected: {
      brand: "dhd",
      model: "dna",
      lengthInches: 71,
      source: "surfgarage",
    },
    description: "SG format - DHD DNA",
  },

  // Unknown brand
  {
    input: "Custom Surfboard 6'0\"",
    source: "surfgarage",
    expected: {
      brand: null,
      model: "custom",
      lengthInches: 72,
      source: "surfgarage",
    },
    description: "Unknown brand - returns null",
  },

  // No dimensions
  {
    input: "Firewire Seaside - Helium",
    source: "hawaiian-south-shore",
    expected: {
      brand: "firewire",
      model: "seaside",
      lengthInches: null,
      source: "hawaiian-south-shore",
    },
    description: "No dimensions - returns null lengthInches",
  },
];

function runSignatureTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running extractProductSignature tests...\n");

  for (const testCase of signatureTestCases) {
    const result = extractProductSignature(testCase.input, testCase.source);
    const isEqual =
      result.brand === testCase.expected.brand &&
      result.model === testCase.expected.model &&
      result.lengthInches === testCase.expected.lengthInches &&
      result.source === testCase.expected.source;

    if (isEqual) {
      passed++;
      console.log(`✓ ${testCase.description}`);
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Input: "${testCase.input}"
    Expected: ${JSON.stringify(testCase.expected)}
    Got: ${JSON.stringify(result)}`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `extractProductSignature: ${passed} passed, ${failed} failed out of ${signatureTestCases.length} tests`
  );

  return { passed, failed, failures };
}

// ============================================================================
// compareSignatures tests
// ============================================================================

interface CompareTestCase {
  sig1: ProductSignature;
  sig2: ProductSignature;
  expectedScoreRange: { min: number; max: number };
  expectedBrandMatch: boolean;
  description: string;
}

const compareTestCases: CompareTestCase[] = [
  // Perfect matches
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "seaside", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0.95, max: 1.0 },
    expectedBrandMatch: true,
    description: "Perfect match - same brand, model, length",
  },
  {
    sig1: { brand: "channel islands", model: "fishbeard", lengthInches: 70, source: "hss" },
    sig2: { brand: "channel islands", model: "fishbeard", lengthInches: 70, source: "sg" },
    expectedScoreRange: { min: 0.95, max: 1.0 },
    expectedBrandMatch: true,
    description: "Perfect match - Channel Islands Fishbeard",
  },

  // Close matches (within tolerance)
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "seaside", lengthInches: 69, source: "sg" },
    expectedScoreRange: { min: 0.9, max: 1.0 },
    expectedBrandMatch: true,
    description: "Close match - 1 inch length difference (within tolerance)",
  },
  {
    sig1: { brand: "lost", model: "puddle jumper", lengthInches: 66, source: "hss" },
    sig2: { brand: "lost", model: "puddle jumper hp", lengthInches: 66, source: "sg" },
    expectedScoreRange: { min: 0.7, max: 0.95 },
    expectedBrandMatch: true,
    description: "Close match - slight model name variation (HP suffix)",
  },

  // Brand mismatch (should fail)
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "lost", model: "seaside", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0, max: 0 },
    expectedBrandMatch: false,
    description: "Brand mismatch - different brands, same model name",
  },

  // Model mismatch
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "dominator", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0, max: 0.5 },
    expectedBrandMatch: true,
    description: "Model mismatch - same brand, different models",
  },

  // Length difference > tolerance
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "seaside", lengthInches: 72, source: "sg" },
    expectedScoreRange: { min: 0.3, max: 0.7 },
    expectedBrandMatch: true,
    description: "Length mismatch - 4 inch difference (outside tolerance)",
  },

  // One brand is null (neutral match)
  {
    sig1: { brand: null, model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "seaside", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0.8, max: 0.95 },
    expectedBrandMatch: true,
    description: "One null brand - should still match on model and length",
  },
  {
    sig1: { brand: null, model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: null, model: "seaside", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0.8, max: 0.95 },
    expectedBrandMatch: true,
    description: "Both null brands - should match on model and length",
  },

  // One length is null (neutral match)
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: null, source: "hss" },
    sig2: { brand: "firewire", model: "seaside", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0.8, max: 0.95 },
    expectedBrandMatch: true,
    description: "One null length - should still match on brand and model",
  },

  // Real-world test case pairs from duplicate-test-cases.ts
  {
    sig1: { brand: "pyzel", model: "phantom", lengthInches: 72, source: "hss" },
    sig2: { brand: "pyzel", model: "phantom", lengthInches: 72, source: "sg" },
    expectedScoreRange: { min: 0.95, max: 1.0 },
    expectedBrandMatch: true,
    description: "Real pair - Pyzel Phantom 6'0",
  },
  {
    sig1: { brand: "dhd", model: "mf dna", lengthInches: 71, source: "hss" },
    sig2: { brand: "dhd", model: "dna", lengthInches: 71, source: "sg" },
    expectedScoreRange: { min: 0.2, max: 0.5 },
    expectedBrandMatch: true,
    description: "Real pair - DHD DNA with/without MF prefix (model names differ significantly)",
  },

  // Negative test cases (should NOT match)
  {
    sig1: { brand: "firewire", model: "seaside", lengthInches: 68, source: "hss" },
    sig2: { brand: "firewire", model: "dominator", lengthInches: 68, source: "sg" },
    expectedScoreRange: { min: 0, max: 0.5 },
    expectedBrandMatch: true,
    description: "Negative - same brand, different models",
  },
  {
    sig1: { brand: "lost", model: "puddle jumper", lengthInches: 66, source: "hss" },
    sig2: { brand: "lost", model: "puddle jumper", lengthInches: 74, source: "sg" },
    expectedScoreRange: { min: 0.3, max: 0.7 },
    expectedBrandMatch: true,
    description: "Negative - same model, very different sizes (5'6 vs 6'2)",
  },
];

function runCompareTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running compareSignatures tests...\n");

  for (const testCase of compareTestCases) {
    const result = compareSignatures(testCase.sig1, testCase.sig2);
    const scoreInRange =
      result.score >= testCase.expectedScoreRange.min &&
      result.score <= testCase.expectedScoreRange.max;
    const brandMatchCorrect = result.brandMatch === testCase.expectedBrandMatch;
    const isPass = scoreInRange && brandMatchCorrect;

    if (isPass) {
      passed++;
      console.log(`✓ ${testCase.description} (score: ${result.score.toFixed(2)})`);
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Score: ${result.score.toFixed(2)} (expected ${testCase.expectedScoreRange.min}-${testCase.expectedScoreRange.max})
    BrandMatch: ${result.brandMatch} (expected ${testCase.expectedBrandMatch})
    ModelSimilarity: ${result.modelSimilarity.toFixed(2)}
    LengthDiff: ${result.lengthDifferenceInches}`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `compareSignatures: ${passed} passed, ${failed} failed out of ${compareTestCases.length} tests`
  );

  return { passed, failed, failures };
}

// ============================================================================
// findDuplicates integration tests
// ============================================================================

/**
 * Creates a mock Surfboard object for testing
 */
function createMockSurfboard(id: string, name: string, source: string, shaper?: string): Surfboard {
  return {
    _id: id,
    _type: "surfboard",
    name,
    source: source as "hawaiian-south-shore" | "surfgarage",
    sourceName: source === "hawaiian-south-shore" ? "Hawaiian South Shore" : "Surf Garage",
    shaper,
    slug: { current: id },
    sourceId: `${source}-${id}`,
    sourceUrl: `https://example.com/${id}`,
    stockStatus: "in_stock",
  };
}

interface IntegrationTestCase {
  description: string;
  products: Surfboard[];
  expectedMatchCount: number;
  expectedMatches?: { id1: string; id2: string; minScore: number }[];
  expectedNonMatches?: { id1: string; id2: string }[];
}

const integrationTestCases: IntegrationTestCase[] = [
  // Test with known duplicate test cases (should match)
  {
    description: "Firewire Seaside - should match across sources",
    products: [
      createMockSurfboard(
        "hss-1",
        "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
        "hawaiian-south-shore",
        "Firewire"
      ),
      createMockSurfboard("sg-1", "Firewire Seaside 5'8\" Surfboard", "surfgarage", "Firewire"),
    ],
    expectedMatchCount: 1,
    expectedMatches: [{ id1: "hss-1", id2: "sg-1", minScore: 0.85 }],
  },
  {
    description: "Channel Islands Fishbeard - CI vs full name should match",
    products: [
      createMockSurfboard(
        "hss-2",
        "CI Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II",
        "hawaiian-south-shore",
        "Channel Islands"
      ),
      createMockSurfboard(
        "sg-2",
        "Channel Islands Fishbeard 5-10",
        "surfgarage",
        "Channel Islands"
      ),
    ],
    expectedMatchCount: 1,
    expectedMatches: [{ id1: "hss-2", id2: "sg-2", minScore: 0.85 }],
  },
  {
    description: "Pyzel Phantom - color variation should match",
    products: [
      createMockSurfboard(
        "hss-3",
        "Pyzel Phantom 6'0 x 19 1/4 x 2 7/16 - White",
        "hawaiian-south-shore",
        "Pyzel"
      ),
      createMockSurfboard("sg-3", "Pyzel Phantom 6'0\" Surfboard", "surfgarage", "Pyzel"),
    ],
    expectedMatchCount: 1,
    expectedMatches: [{ id1: "hss-3", id2: "sg-3", minScore: 0.85 }],
  },
  {
    description: "Haydenshapes Hypto Krypto - tech names should be filtered",
    products: [
      createMockSurfboard(
        "hss-4",
        "Haydenshapes Hypto Krypto 5'10 FutureFlex FF - Blue",
        "hawaiian-south-shore",
        "Haydenshapes"
      ),
      createMockSurfboard("sg-4", "Haydenshapes Hypto Krypto 5-10", "surfgarage", "Haydenshapes"),
    ],
    expectedMatchCount: 1,
    expectedMatches: [{ id1: "hss-4", id2: "sg-4", minScore: 0.85 }],
  },

  // False positive prevention tests
  {
    description: "Different models same brand - should NOT match",
    products: [
      createMockSurfboard(
        "hss-5",
        "Firewire Machado Seaside 5'8 x 20 1/4 x 2 1/2",
        "hawaiian-south-shore",
        "Firewire"
      ),
      createMockSurfboard(
        "sg-5",
        "Firewire Machado Sunday 5'8\" Surfboard",
        "surfgarage",
        "Firewire"
      ),
    ],
    expectedMatchCount: 0,
    expectedNonMatches: [{ id1: "hss-5", id2: "sg-5" }],
  },
  {
    description: "Same model different sizes - should NOT match",
    products: [
      createMockSurfboard(
        "hss-6",
        "Firewire Seaside 5'8 x 20 1/4 x 2 1/2",
        "hawaiian-south-shore",
        "Firewire"
      ),
      createMockSurfboard("sg-6", "Firewire Seaside 6'2\" Surfboard", "surfgarage", "Firewire"),
    ],
    expectedMatchCount: 0,
    expectedNonMatches: [{ id1: "hss-6", id2: "sg-6" }],
  },

  // crossSourceOnly test
  {
    description: "Same source products - should NOT match when crossSourceOnly=true",
    products: [
      createMockSurfboard(
        "hss-7",
        "Firewire Seaside 5'8 x 20 1/4 x 2 1/2",
        "hawaiian-south-shore",
        "Firewire"
      ),
      createMockSurfboard(
        "hss-8",
        "Firewire Seaside 5'8 x 20 1/4 x 2 1/2",
        "hawaiian-south-shore",
        "Firewire"
      ),
    ],
    expectedMatchCount: 0,
  },

  // Multiple products mixed test
  {
    description: "Multiple products - should find correct matches",
    products: [
      createMockSurfboard(
        "hss-10",
        "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
        "hawaiian-south-shore",
        "Firewire"
      ),
      createMockSurfboard("sg-10", "Firewire Seaside 5'8\" Surfboard", "surfgarage", "Firewire"),
      createMockSurfboard(
        "hss-11",
        "Pyzel Phantom 6'0 x 19 1/4 x 2 7/16 - White",
        "hawaiian-south-shore",
        "Pyzel"
      ),
      createMockSurfboard("sg-11", "Lost Puddle Jumper 5'6\"", "surfgarage", "Lost"),
    ],
    expectedMatchCount: 1, // Only Seaside should match
    expectedMatches: [{ id1: "hss-10", id2: "sg-10", minScore: 0.85 }],
  },
];

function runIntegrationTests(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running findDuplicates integration tests...\n");

  for (const testCase of integrationTestCases) {
    const matches = findDuplicates(testCase.products, { threshold: 0.85, crossSourceOnly: true });

    // Check expected match count
    if (matches.length !== testCase.expectedMatchCount) {
      failed++;
      const errorMsg = `✗ ${testCase.description}
    Expected ${testCase.expectedMatchCount} matches, got ${matches.length}
    Matches found: ${JSON.stringify(matches.map((m) => ({ id1: m.productId, id2: m.matchedProductId, score: m.similarity.toFixed(2) })))}`;
      console.log(errorMsg);
      failures.push(errorMsg);
      continue;
    }

    // Check expected specific matches
    let allMatchesCorrect = true;
    if (testCase.expectedMatches) {
      for (const expected of testCase.expectedMatches) {
        const found = matches.find(
          (m) =>
            (m.productId === expected.id1 && m.matchedProductId === expected.id2) ||
            (m.productId === expected.id2 && m.matchedProductId === expected.id1)
        );
        if (!found || found.similarity < expected.minScore) {
          allMatchesCorrect = false;
          const errorMsg = `✗ ${testCase.description}
    Expected match between ${expected.id1} and ${expected.id2} with score >= ${expected.minScore}
    ${found ? `Found with score ${found.similarity.toFixed(2)}` : "Not found"}`;
          console.log(errorMsg);
          failures.push(errorMsg);
        }
      }
    }

    // Check expected non-matches
    if (testCase.expectedNonMatches) {
      for (const nonMatch of testCase.expectedNonMatches) {
        const found = matches.find(
          (m) =>
            (m.productId === nonMatch.id1 && m.matchedProductId === nonMatch.id2) ||
            (m.productId === nonMatch.id2 && m.matchedProductId === nonMatch.id1)
        );
        if (found) {
          allMatchesCorrect = false;
          const errorMsg = `✗ ${testCase.description}
    Expected NO match between ${nonMatch.id1} and ${nonMatch.id2}
    But found match with score ${found.similarity.toFixed(2)}`;
          console.log(errorMsg);
          failures.push(errorMsg);
        }
      }
    }

    if (allMatchesCorrect && matches.length === testCase.expectedMatchCount) {
      passed++;
      console.log(`✓ ${testCase.description}`);
      // Log match details for successful matches
      for (const match of matches) {
        const p1 = testCase.products.find((p) => p._id === match.productId);
        const p2 = testCase.products.find((p) => p._id === match.matchedProductId);
        if (p1 && p2) {
          logMatchDetails(match, p1.name, p2.name);
        }
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `findDuplicates integration: ${passed} passed, ${failed} failed out of ${integrationTestCases.length} tests`
  );

  return { passed, failed, failures };
}

// ============================================================================
// Test with all DUPLICATE_TEST_CASES from duplicate-test-cases.ts
// ============================================================================

function runDuplicateTestCasesValidation(): { passed: number; failed: number; failures: string[] } {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  console.log("\n" + "=".repeat(50));
  console.log("Running validation against DUPLICATE_TEST_CASES...\n");

  for (const testCase of DUPLICATE_TEST_CASES) {
    const products: Surfboard[] = [
      createMockSurfboard("hss-tc", testCase.hssName, "hawaiian-south-shore", testCase.hssShaper),
      createMockSurfboard("sg-tc", testCase.sgName, "surfgarage", testCase.sgShaper),
    ];

    const matches = findDuplicates(products, { threshold: 0.85, crossSourceOnly: true });
    const foundMatch = matches.length > 0;

    if (foundMatch === testCase.shouldMatch) {
      passed++;
      const symbol = testCase.shouldMatch ? "✓" : "○";
      console.log(
        `${symbol} ${testCase.name} ${foundMatch ? `(score: ${matches[0]?.similarity.toFixed(2)})` : "(correctly rejected)"}`
      );
    } else {
      failed++;
      const errorMsg = `✗ ${testCase.name}
    HSS: "${testCase.hssName}"
    SG:  "${testCase.sgName}"
    Expected: ${testCase.shouldMatch ? "MATCH" : "NO MATCH"}
    Got: ${foundMatch ? `MATCH (score: ${matches[0]?.similarity.toFixed(2)})` : "NO MATCH"}
    ${testCase.notes ? `Notes: ${testCase.notes}` : ""}`;
      console.log(errorMsg);
      failures.push(errorMsg);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(
    `DUPLICATE_TEST_CASES validation: ${passed} passed, ${failed} failed out of ${DUPLICATE_TEST_CASES.length} tests`
  );

  return { passed, failed, failures };
}

// Run all tests
runTests();
const brandResults = runBrandTests();
const modelResults = runModelTests();
const signatureResults = runSignatureTests();
const compareResults = runCompareTests();
const integrationResults = runIntegrationTests();
const duplicateTestCasesResults = runDuplicateTestCasesValidation();

// Final summary
console.log("\n" + "=".repeat(50));
console.log("OVERALL SUMMARY");
console.log("=".repeat(50));

const allFailures = [
  ...brandResults.failures,
  ...modelResults.failures,
  ...signatureResults.failures,
  ...compareResults.failures,
  ...integrationResults.failures,
  ...duplicateTestCasesResults.failures,
];

if (allFailures.length > 0) {
  console.log(`\n${allFailures.length} test(s) failed:`);
  allFailures.forEach((f) => console.log(f));
  process.exit(1);
}

console.log("\nAll tests passed!");
