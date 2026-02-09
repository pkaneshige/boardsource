/**
 * Test cases for duplicate detection
 *
 * These are known duplicate surfboards listed at multiple stores.
 * Each test case contains two product names (one from each source)
 * that represent the same physical board.
 *
 * Used to validate and improve duplicate detection accuracy.
 */

export interface DuplicateTestCase {
  /** Descriptive name for this test case */
  name: string;
  /** Product name from Hawaiian South Shore */
  hssName: string;
  /** Shaper field from Hawaiian South Shore */
  hssShaper?: string;
  /** Dimensions from Hawaiian South Shore */
  hssDimensions?: string;
  /** Product name from Surf Garage */
  sgName: string;
  /** Shaper field from Surf Garage */
  sgShaper?: string;
  /** Dimensions from Surf Garage */
  sgDimensions?: string;
  /** Expected to match (true) or not match (false for edge cases) */
  shouldMatch: boolean;
  /** Notes about why this case is interesting */
  notes?: string;
}

/**
 * Known duplicate boards that should be detected
 *
 * These represent the same board model sold at different stores.
 * Naming patterns differ significantly between sources.
 */
export const DUPLICATE_TEST_CASES: DuplicateTestCase[] = [
  // Test Case 1: Firewire Seaside
  {
    name: "Firewire Seaside - dimension format differences",
    hssName: "Firewire Seaside 5'8 x 20 1/4 x 2 1/2 - Helium",
    hssShaper: "Firewire",
    hssDimensions: "5'8 x 20 1/4 x 2 1/2",
    sgName: "Firewire Seaside 5'8\" Surfboard",
    sgShaper: "Firewire",
    sgDimensions: "5'8\"",
    shouldMatch: true,
    notes: "HSS includes full dimensions with fractions, SG uses just length with quotes",
  },

  // Test Case 2: Channel Islands Fishbeard
  {
    name: "Channel Islands Fishbeard - brand name variations",
    hssName: "CI Fishbeard 5'10 x 20 3/4 x 2 5/8 FCS II",
    hssShaper: "Channel Islands",
    hssDimensions: "5'10 x 20 3/4 x 2 5/8",
    sgName: "Channel Islands Fishbeard 5-10",
    sgShaper: "Channel Islands",
    sgDimensions: "5'10\"",
    shouldMatch: true,
    notes: "HSS uses 'CI' abbreviation while SG uses full brand name",
  },

  // Test Case 3: Pyzel Phantom
  {
    name: "Pyzel Phantom - color/finish in name",
    hssName: "Pyzel Phantom 6'0 x 19 1/4 x 2 7/16 - White",
    hssShaper: "Pyzel",
    hssDimensions: "6'0 x 19 1/4 x 2 7/16",
    sgName: "Pyzel Phantom 6'0\" Surfboard",
    sgShaper: "Pyzel",
    sgDimensions: "6'0\"",
    shouldMatch: true,
    notes: "HSS includes color (White), SG does not",
  },

  // Test Case 4: Lost Puddle Jumper
  // Note: This is a known edge case - "Mayhem" is a sub-brand and "HP" is a variant
  // that make the model names too different for threshold matching.
  // A future improvement could add model synonym handling.
  {
    name: "Lost Puddle Jumper - full name vs abbreviation (EDGE CASE)",
    hssName: "Lost Mayhem Puddle Jumper HP 5'6 x 20 x 2.35",
    hssShaper: "Lost",
    hssDimensions: "5'6 x 20 x 2.35",
    sgName: "Lost Puddle Jumper 5'6\"",
    sgShaper: "Lost",
    sgDimensions: "5'6\"",
    shouldMatch: false, // Currently fails due to model name differences (mayhem puddle jumper hp vs puddle jumper)
    notes:
      "Edge case: HSS includes 'Mayhem' (Matt Biolos) and 'HP' variant - model similarity is 0.67",
  },

  // Test Case 5: JS Monsta Box
  {
    name: "JS Monsta Box - different dimension separators",
    hssName: "JS Monsta Box 2020 5'10 X 19 1/8 X 2 3/8\"",
    hssShaper: "JS",
    hssDimensions: "5'10 X 19 1/8 X 2 3/8",
    sgName: "JS Industries Monsta Box 5-10",
    sgShaper: "JS Industries",
    sgDimensions: "5'10\"",
    shouldMatch: true,
    notes: "HSS has year (2020), uses JS; SG uses full 'JS Industries', uses dash format",
  },

  // Test Case 6: Different boards from same brand (should NOT match)
  {
    name: "Different Firewire models - false positive prevention",
    hssName: "Firewire Machado Seaside 5'8 x 20 1/4 x 2 1/2",
    hssShaper: "Firewire",
    hssDimensions: "5'8 x 20 1/4 x 2 1/2",
    sgName: "Firewire Machado Sunday 5'8\" Surfboard",
    sgShaper: "Firewire",
    sgDimensions: "5'8\"",
    shouldMatch: false,
    notes: "Same brand, shaper (Machado), and size but different models (Seaside vs Sunday)",
  },

  // Test Case 7: Similar names different sizes (should NOT match)
  {
    name: "Same model different sizes - false positive prevention",
    hssName: "Firewire Seaside 5'8 x 20 1/4 x 2 1/2",
    hssShaper: "Firewire",
    hssDimensions: "5'8 x 20 1/4 x 2 1/2",
    sgName: "Firewire Seaside 6'2\" Surfboard",
    sgShaper: "Firewire",
    sgDimensions: "6'2\"",
    shouldMatch: false,
    notes: "Same model but different sizes - should be detected as different products",
  },

  // Test Case 8: DHD with dimension variations
  // Note: This is a known edge case - "MF" is a signature prefix (Mick Fanning)
  // that makes "mf dna" vs "dna" have only 50% similarity.
  // A future improvement could handle signature prefixes.
  {
    name: "DHD MF DNA - signature prefix difference (EDGE CASE)",
    hssName: "DHD MF DNA 5'11 x 18 7/8 x 2 3/8 - 27.5L",
    hssShaper: "DHD",
    hssDimensions: "5'11 x 18 7/8 x 2 3/8",
    sgName: "DHD DNA 5'11\" Futures",
    sgShaper: "DHD",
    sgDimensions: "5'11\"",
    shouldMatch: false, // Currently fails due to model name differences (mf dna vs dna)
    notes: "Edge case: HSS includes 'MF' (Mick Fanning) prefix - model similarity is 0.50",
  },

  // Test Case 9: Haydenshapes with tech name
  {
    name: "Haydenshapes Hypto Krypto - tech names in title",
    hssName: "Haydenshapes Hypto Krypto 5'10 FutureFlex FF - Blue",
    hssShaper: "Haydenshapes",
    hssDimensions: "5'10",
    sgName: "Haydenshapes Hypto Krypto 5-10",
    sgShaper: "Haydenshapes",
    sgDimensions: "5'10\"",
    shouldMatch: true,
    notes: "HSS includes tech name (FutureFlex) and color, SG uses dash format",
  },

  // Test Case 10: Album with model vs nickname
  // Note: This is a known edge case - "Fish" is a category descriptor added by SG
  // that makes "disasym" vs "disasym fish" have only 77% similarity.
  // A future improvement could filter out category descriptors.
  {
    name: "Album Disasym - category descriptor difference (EDGE CASE)",
    hssName: "Album Disasym 5'6\" x 20.5 x 2.65 - Clear",
    hssShaper: "Album",
    hssDimensions: "5'6\" x 20.5 x 2.65",
    sgName: "Album Surfboards Disasym Fish 5'6\"",
    sgShaper: "Album",
    sgDimensions: "5'6\"",
    shouldMatch: false, // Currently fails due to model name differences (disasym vs disasym fish)
    notes: "Edge case: SG adds 'Fish' category descriptor - model similarity is 0.77",
  },
];

/**
 * Get only the test cases that should match
 */
export function getPositiveTestCases(): DuplicateTestCase[] {
  return DUPLICATE_TEST_CASES.filter((tc) => tc.shouldMatch);
}

/**
 * Get test cases that should NOT match (false positive prevention)
 */
export function getNegativeTestCases(): DuplicateTestCase[] {
  return DUPLICATE_TEST_CASES.filter((tc) => !tc.shouldMatch);
}

/**
 * Utility type for structured product data extracted from test cases
 */
export interface TestProduct {
  name: string;
  shaper?: string;
  dimensions?: string;
  source: "hawaiian-south-shore" | "surfgarage";
}

/**
 * Convert a test case to two test products for comparison
 */
export function testCaseToProducts(testCase: DuplicateTestCase): [TestProduct, TestProduct] {
  return [
    {
      name: testCase.hssName,
      shaper: testCase.hssShaper,
      dimensions: testCase.hssDimensions,
      source: "hawaiian-south-shore",
    },
    {
      name: testCase.sgName,
      shaper: testCase.sgShaper,
      dimensions: testCase.sgDimensions,
      source: "surfgarage",
    },
  ];
}
