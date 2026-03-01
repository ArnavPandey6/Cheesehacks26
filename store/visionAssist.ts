import type { ConditionLevel, UtilityLevel } from '@/store/karma';

const GOOGLE_VISION_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';
const GOOGLE_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;

type VisionLabel = {
  description?: string;
  score?: number;
};

type VisionObject = {
  name?: string;
  score?: number;
};

type VisionLogo = {
  description?: string;
  score?: number;
};

type VisionTextAnnotation = {
  description?: string;
};

type VisionWebEntity = {
  description?: string;
  score?: number;
};

type VisionBestGuessLabel = {
  label?: string;
};

type VisionPageWithMatchingImage = {
  url?: string;
  pageTitle?: string;
};

type VisionWebDetection = {
  webEntities?: VisionWebEntity[];
  bestGuessLabels?: VisionBestGuessLabel[];
  pagesWithMatchingImages?: VisionPageWithMatchingImage[];
};

type VisionApiSingleResponse = {
  labelAnnotations?: VisionLabel[];
  localizedObjectAnnotations?: VisionObject[];
  logoAnnotations?: VisionLogo[];
  textAnnotations?: VisionTextAnnotation[];
  webDetection?: VisionWebDetection;
  error?: { message?: string };
};

type AnnotateImageResponse = {
  responses?: VisionApiSingleResponse[];
};

type CategoryRule = {
  name: string;
  utilityLevel: UtilityLevel;
  estimatedPriceRange: [number, number];
  keywords: string[];
  antiKeywords?: string[];
};

type WeightedToken = {
  text: string;
  weight: number;
  source: 'object' | 'label' | 'web' | 'guess' | 'ocr' | 'logo';
};

type ScoredCategory = {
  rule: CategoryRule;
  score: number;
};

type MarketPriceSummary = {
  median: number;
  mean: number;
  count: number;
  stdDeviationRatio: number;
};

export type VisionAssistSuggestion = {
  itemName: string;
  description: string;
  utilityLevel: UtilityLevel;
  conditionLevel: ConditionLevel;
  estimatedPrice: number;
  estimatedPriceLow: number;
  estimatedPriceHigh: number;
  confidence: number;
  priceConfidence: number;
  labels: string[];
  extractedText: string;
};

export const isVisionConfigured = Boolean(GOOGLE_VISION_API_KEY);

const categoryRules: CategoryRule[] = [
  { name: 'Laptop', utilityLevel: 'high', estimatedPriceRange: [250, 1300], keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'computer'] },
  { name: 'Monitor', utilityLevel: 'high', estimatedPriceRange: [60, 420], keywords: ['monitor', 'display', 'screen'], antiKeywords: ['television', 'tv'] },
  { name: 'Television', utilityLevel: 'high', estimatedPriceRange: [90, 800], keywords: ['television', 'tv', 'smart tv'] },
  { name: 'Office Chair', utilityLevel: 'high', estimatedPriceRange: [30, 250], keywords: ['office chair', 'desk chair', 'chair', 'seat'] },
  { name: 'Desk', utilityLevel: 'high', estimatedPriceRange: [40, 280], keywords: ['desk', 'computer desk', 'workstation', 'table'] },
  { name: 'Microwave', utilityLevel: 'high', estimatedPriceRange: [25, 180], keywords: ['microwave', 'microwave oven'] },
  { name: 'Mini Fridge', utilityLevel: 'high', estimatedPriceRange: [60, 340], keywords: ['mini fridge', 'refrigerator', 'fridge'] },
  { name: 'Vacuum', utilityLevel: 'high', estimatedPriceRange: [40, 420], keywords: ['vacuum', 'vacuum cleaner', 'cleaner'] },
  { name: 'Tool Set', utilityLevel: 'high', estimatedPriceRange: [15, 320], keywords: ['tool', 'toolbox', 'drill', 'screwdriver', 'wrench', 'hammer'] },
  { name: 'Printer', utilityLevel: 'medium', estimatedPriceRange: [30, 260], keywords: ['printer', 'scanner', 'inkjet', 'laser printer'] },
  { name: 'Router', utilityLevel: 'medium', estimatedPriceRange: [20, 180], keywords: ['router', 'modem', 'wifi router'] },
  { name: 'Keyboard', utilityLevel: 'medium', estimatedPriceRange: [10, 140], keywords: ['keyboard', 'mechanical keyboard'] },
  { name: 'Mouse', utilityLevel: 'medium', estimatedPriceRange: [8, 90], keywords: ['mouse', 'computer mouse'] },
  { name: 'Headphones', utilityLevel: 'medium', estimatedPriceRange: [20, 320], keywords: ['headphones', 'headset', 'earbuds'] },
  { name: 'Speaker', utilityLevel: 'medium', estimatedPriceRange: [20, 320], keywords: ['speaker', 'soundbar', 'subwoofer', 'bluetooth speaker'] },
  { name: 'Coffee Maker', utilityLevel: 'medium', estimatedPriceRange: [20, 180], keywords: ['coffee maker', 'espresso', 'keurig', 'coffee machine'] },
  { name: 'Air Fryer', utilityLevel: 'medium', estimatedPriceRange: [25, 180], keywords: ['air fryer'] },
  { name: 'Blender', utilityLevel: 'medium', estimatedPriceRange: [15, 130], keywords: ['blender'] },
  { name: 'Toaster', utilityLevel: 'medium', estimatedPriceRange: [10, 70], keywords: ['toaster', 'toaster oven'] },
  { name: 'Lamp', utilityLevel: 'medium', estimatedPriceRange: [10, 120], keywords: ['lamp', 'light fixture', 'light'] },
  { name: 'Shelf', utilityLevel: 'medium', estimatedPriceRange: [20, 200], keywords: ['shelf', 'bookcase', 'storage shelf'] },
  { name: 'Dresser', utilityLevel: 'medium', estimatedPriceRange: [40, 320], keywords: ['dresser', 'drawer', 'cabinet'] },
  { name: 'Sofa', utilityLevel: 'medium', estimatedPriceRange: [80, 900], keywords: ['sofa', 'couch', 'loveseat'] },
  { name: 'Mattress', utilityLevel: 'medium', estimatedPriceRange: [60, 500], keywords: ['mattress', 'bed'] },
  { name: 'Bicycle', utilityLevel: 'medium', estimatedPriceRange: [60, 1000], keywords: ['bicycle', 'bike'] },
  { name: 'Suitcase', utilityLevel: 'low', estimatedPriceRange: [20, 220], keywords: ['suitcase', 'luggage'] },
  { name: 'Backpack', utilityLevel: 'low', estimatedPriceRange: [8, 120], keywords: ['backpack', 'bag'] },
  { name: 'Clothing', utilityLevel: 'low', estimatedPriceRange: [5, 90], keywords: ['shirt', 'jacket', 'pants', 'clothing', 'hoodie', 'dress', 'shoes'] },
  { name: 'Book', utilityLevel: 'low', estimatedPriceRange: [3, 40], keywords: ['book', 'textbook', 'novel'] },
  { name: 'Decor', utilityLevel: 'low', estimatedPriceRange: [5, 90], keywords: ['decor', 'vase', 'frame', 'ornament', 'art'] },
];

const newConditionKeywords = ['brand new', 'new in box', 'sealed', 'unused', 'mint', 'unopened'];
const wornConditionKeywords = ['broken', 'damaged', 'cracked', 'stained', 'worn', 'scratched', 'repair', 'parts only', 'rust'];
const goodConditionKeywords = ['good condition', 'working', 'works', 'clean', 'gently used', 'functional'];

const conditionPriceMultiplier: Record<ConditionLevel, number> = {
  new: 1.18,
  good: 1,
  worn: 0.62,
};

const brandMultipliers: Record<string, number> = {
  apple: 1.35,
  samsung: 1.2,
  sony: 1.2,
  bose: 1.25,
  dyson: 1.3,
  dell: 1.15,
  hp: 1.1,
  lenovo: 1.1,
  asus: 1.1,
  acer: 1.06,
  lg: 1.15,
  microsoft: 1.2,
  google: 1.15,
  canon: 1.15,
  nikon: 1.12,
  jbl: 1.12,
  anker: 1.08,
  ikea: 0.96,
  ninja: 1.1,
  keurig: 1.08,
  kitchenaid: 1.12,
  panasonic: 1.08,
  philips: 1.08,
};

const knownBrands = Object.keys(brandMultipliers);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const titleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');

const stripDataUriPrefix = (value: string) => {
  const separatorIndex = value.indexOf(',');
  if (value.startsWith('data:') && separatorIndex > -1) {
    return value.slice(separatorIndex + 1);
  }
  return value;
};

const pushWeightedToken = (
  map: Record<string, WeightedToken>,
  rawText: string,
  rawWeight: number,
  source: WeightedToken['source']
) => {
  const text = normalizeText(rawText);
  if (!text) return;

  const weight = clamp(rawWeight, 0.05, 2.5);
  const existing = map[text];
  if (existing) {
    if (weight > existing.weight) map[text] = { text, weight, source };
    return;
  }

  map[text] = { text, weight, source };
};

const tokenizeOcrText = (ocrText: string) => {
  const normalized = normalizeText(ocrText);
  if (!normalized) return [];

  const phraseCandidates = normalized
    .split('\n')
    .map((line) => normalizeText(line))
    .filter(Boolean);

  const wordCandidates = normalized.split(' ').filter((token) => token.length >= 3);
  return [...new Set([...phraseCandidates, ...wordCandidates])];
};

const parsePriceCandidatesFromText = (rawText: string) => {
  const text = rawText.replace(/,/g, ' ');
  const values: number[] = [];

  const addCandidate = (rawValue: string) => {
    const numeric = Number.parseFloat(rawValue.replace(/,/g, '.'));
    if (!Number.isFinite(numeric)) return;
    if (numeric < 5 || numeric > 5000) return;
    values.push(numeric);
  };

  const dollarRegex = /\$\s?(\d{1,4}(?:[.,]\d{1,2})?)/g;
  let match: RegExpExecArray | null = dollarRegex.exec(text);
  while (match) {
    if (match[1]) addCandidate(match[1]);
    match = dollarRegex.exec(text);
  }

  const contextualRegex = /\b(?:price|asking|obo|firm|sale|only|for)\s*[:\-]?\s*\$?\s?(\d{1,4}(?:[.,]\d{1,2})?)\b/gi;
  match = contextualRegex.exec(text);
  while (match) {
    if (match[1]) addCandidate(match[1]);
    match = contextualRegex.exec(text);
  }

  const usdRegex = /\b(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:usd|dollars?)\b/gi;
  match = usdRegex.exec(text);
  while (match) {
    if (match[1]) addCandidate(match[1]);
    match = usdRegex.exec(text);
  }

  return [...new Set(values.map((value) => Math.round(value * 100) / 100))];
};

const parsePriceCandidatesFromPageTitles = (pages: VisionPageWithMatchingImage[]) => {
  const titles = pages.map((page) => page.pageTitle ?? '').filter(Boolean).join('\n');
  return parsePriceCandidatesFromText(titles);
};

const extractModelTokens = (rawText: string) => {
  const modelRegex = /\b([A-Z]{1,4}[-]?\d{2,6}[A-Z0-9-]{0,6})\b/g;
  const models: string[] = [];
  let match: RegExpExecArray | null = modelRegex.exec(rawText);
  while (match) {
    const token = (match[1] ?? '').trim();
    if (token.length >= 4) models.push(token);
    match = modelRegex.exec(rawText);
  }
  return [...new Set(models)];
};

const includesKeyword = (haystack: string, keyword: string) => {
  if (!haystack || !keyword) return false;
  if (haystack === keyword) return true;
  if (haystack.includes(keyword)) return true;
  return false;
};

const scoreCategories = (tokens: WeightedToken[], ocrText: string) => {
  const ocrNormalized = normalizeText(ocrText);

  const scored: ScoredCategory[] = categoryRules.map((rule) => {
    let score = 0;

    for (const token of tokens) {
      for (const keyword of rule.keywords) {
        if (!includesKeyword(token.text, keyword)) continue;
        const exactBoost = token.text === keyword ? 1.25 : 1;
        score += token.weight * exactBoost;
      }
    }

    for (const keyword of rule.keywords) {
      if (ocrNormalized.includes(keyword)) score += 1.15;
    }

    if (rule.antiKeywords) {
      for (const antiKeyword of rule.antiKeywords) {
        if (ocrNormalized.includes(antiKeyword)) score -= 0.8;
      }
    }

    return { rule, score };
  });

  return scored.sort((a, b) => b.score - a.score);
};

const inferCondition = (combinedText: string): ConditionLevel => {
  const text = normalizeText(combinedText);
  if (!text) return 'good';

  let newScore = 0;
  let wornScore = 0;
  let goodScore = 0;

  for (const keyword of newConditionKeywords) {
    if (text.includes(keyword)) newScore += 1.1;
  }
  for (const keyword of wornConditionKeywords) {
    if (text.includes(keyword)) wornScore += 1.2;
  }
  for (const keyword of goodConditionKeywords) {
    if (text.includes(keyword)) goodScore += 0.7;
  }

  if (wornScore >= 1.2 && wornScore > newScore) return 'worn';
  if (newScore >= 1.1 && newScore > wornScore + 0.2) return 'new';
  if (goodScore > 0) return 'good';
  return 'good';
};

const detectBrand = (tokens: WeightedToken[], ocrText: string) => {
  const brandScores: Record<string, number> = {};
  const ocrNormalized = normalizeText(ocrText);

  for (const brand of knownBrands) {
    if (ocrNormalized.includes(brand)) brandScores[brand] = (brandScores[brand] ?? 0) + 0.9;
  }

  for (const token of tokens) {
    for (const brand of knownBrands) {
      if (!token.text.includes(brand)) continue;
      const sourceBoost = token.source === 'logo' ? 1.8 : token.source === 'web' ? 1.25 : 1;
      brandScores[brand] = (brandScores[brand] ?? 0) + token.weight * sourceBoost;
    }
  }

  let bestBrand = '';
  let bestScore = 0;
  for (const [brand, score] of Object.entries(brandScores)) {
    if (score > bestScore) {
      bestBrand = brand;
      bestScore = score;
    }
  }

  if (!bestBrand || bestScore < 0.9) return null;
  return titleCase(bestBrand);
};

const summarizeMarketPrices = (values: number[]): MarketPriceSummary | null => {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 1
    ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;

  const trimStart = sorted.length >= 5 ? 1 : 0;
  const trimEnd = sorted.length >= 5 ? sorted.length - 1 : sorted.length;
  const trimmed = sorted.slice(trimStart, trimEnd);
  const mean = trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length;

  const variance = trimmed.reduce((sum, value) => sum + (value - mean) ** 2, 0) / trimmed.length;
  const stdDeviation = Math.sqrt(variance);
  const stdDeviationRatio = mean > 0 ? stdDeviation / mean : 1;

  return {
    median,
    mean,
    count: sorted.length,
    stdDeviationRatio,
  };
};

const estimatePrice = (input: {
  bestCategory: CategoryRule | null;
  categoryConfidence: number;
  conditionLevel: ConditionLevel;
  brandName: string | null;
  explicitPriceCandidates: number[];
  pageTitlePriceCandidates: number[];
  modelEvidenceScore: number;
}) => {
  const range = input.bestCategory?.estimatedPriceRange ?? [15, 120];
  const [minRange, maxRange] = range;
  const rangeSpan = maxRange - minRange;

  const modeledBase =
    minRange + rangeSpan * clamp(0.52 + input.categoryConfidence * 0.28, 0.33, 0.9);
  const conditionMultiplier = conditionPriceMultiplier[input.conditionLevel];
  const brandMultiplier = input.brandName
    ? (brandMultipliers[normalizeText(input.brandName)] ?? 1)
    : 1;
  const modeledPrice = modeledBase * conditionMultiplier * brandMultiplier;

  const lowerBound = minRange * 0.35;
  const upperBound = maxRange * 1.7;

  const mergedMarketCandidates = [
    ...input.explicitPriceCandidates,
    ...input.pageTitlePriceCandidates,
  ];
  const marketSummary = summarizeMarketPrices(mergedMarketCandidates);

  let blendedPrice = modeledPrice;
  let priceConfidence = clamp(0.28 + input.categoryConfidence * 0.34, 0.2, 0.7);

  if (marketSummary) {
    const marketWeightBase = marketSummary.count >= 5
      ? 0.82
      : marketSummary.count === 4
        ? 0.76
        : marketSummary.count === 3
          ? 0.68
          : marketSummary.count === 2
            ? 0.58
            : 0.46;

    const modelBoost = clamp(input.modelEvidenceScore * 0.08, 0, 0.16);
    const consistencyBoost = clamp((0.3 - marketSummary.stdDeviationRatio) * 0.4, 0, 0.12);
    const marketWeight = clamp(marketWeightBase + modelBoost + consistencyBoost, 0.4, 0.9);

    blendedPrice = marketSummary.median * marketWeight + modeledPrice * (1 - marketWeight);
    priceConfidence = clamp(
      0.42
      + input.categoryConfidence * 0.25
      + marketWeight * 0.2
      + clamp((0.32 - marketSummary.stdDeviationRatio) * 0.25, 0, 0.16),
      0.3,
      0.95
    );
  } else if (input.modelEvidenceScore > 0) {
    priceConfidence = clamp(priceConfidence + 0.08, 0.2, 0.78);
  }

  const finalPrice = Math.round(clamp(blendedPrice, lowerBound, upperBound));

  const rangePct = marketSummary
    ? clamp(0.32 - priceConfidence * 0.2, 0.1, 0.28)
    : clamp(0.4 - priceConfidence * 0.18, 0.16, 0.36);

  const estimatedPriceLow = Math.max(5, Math.round(finalPrice * (1 - rangePct)));
  const estimatedPriceHigh = Math.round(finalPrice * (1 + rangePct));

  return {
    estimatedPrice: finalPrice,
    estimatedPriceLow,
    estimatedPriceHigh,
    priceConfidence,
  };
};

const inferFallbackName = (labels: string[]) => {
  const firstLabel = labels.find((label) => label.length > 2) ?? 'Item';
  return titleCase(firstLabel);
};

const buildSuggestion = (response: VisionApiSingleResponse): VisionAssistSuggestion => {
  const tokenMap: Record<string, WeightedToken> = {};

  for (const object of response.localizedObjectAnnotations ?? []) {
    pushWeightedToken(tokenMap, object.name ?? '', clamp((object.score ?? 0.45) * 1.38, 0.1, 2.2), 'object');
  }
  for (const label of response.labelAnnotations ?? []) {
    pushWeightedToken(tokenMap, label.description ?? '', clamp(label.score ?? 0.4, 0.1, 1.6), 'label');
  }
  for (const entity of response.webDetection?.webEntities ?? []) {
    pushWeightedToken(tokenMap, entity.description ?? '', clamp((entity.score ?? 0.35) * 1.28, 0.08, 1.8), 'web');
  }
  for (const guess of response.webDetection?.bestGuessLabels ?? []) {
    pushWeightedToken(tokenMap, guess.label ?? '', 1.1, 'guess');
  }
  for (const logo of response.logoAnnotations ?? []) {
    pushWeightedToken(tokenMap, logo.description ?? '', clamp((logo.score ?? 0.6) * 1.75, 0.15, 2.4), 'logo');
  }

  const extractedText = (response.textAnnotations?.[0]?.description ?? '').trim();
  const ocrTokens = tokenizeOcrText(extractedText);
  for (const token of ocrTokens) {
    pushWeightedToken(tokenMap, token, 0.45, 'ocr');
  }

  const allTokens = Object.values(tokenMap);
  const scoredCategories = scoreCategories(allTokens, extractedText);
  const bestCategory = scoredCategories[0] ?? null;
  const secondBestCategory = scoredCategories[1] ?? null;

  const topScore = bestCategory?.score ?? 0;
  const secondScore = secondBestCategory?.score ?? 0;
  const scoreGap = topScore > 0 ? clamp((topScore - secondScore) / topScore, 0, 1) : 0;
  const strongSignalCount = allTokens.filter((token) => token.weight >= 0.75).length;
  const signalStrength = clamp(strongSignalCount / 8, 0, 1);
  const categoryConfidence = clamp(topScore / 6.4, 0, 1);

  const confidence = clamp(
    categoryConfidence * 0.56 + scoreGap * 0.24 + signalStrength * 0.2,
    0.2,
    0.99
  );

  const nonOcrLabels = allTokens
    .filter((token) => token.source !== 'ocr')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((token) => token.text);

  const combinedText = `${extractedText} ${nonOcrLabels.join(' ')}`;
  const conditionLevel = inferCondition(combinedText);
  const brandName = detectBrand(allTokens, extractedText);

  const explicitPriceCandidates = parsePriceCandidatesFromText(extractedText);
  const pageTitlePriceCandidates = parsePriceCandidatesFromPageTitles(response.webDetection?.pagesWithMatchingImages ?? []);

  const modelTokens = extractModelTokens(extractedText);
  const modelEvidenceScore = modelTokens.reduce((score, token) => {
    const tokenLower = token.toLowerCase();
    const webHasToken = (response.webDetection?.webEntities ?? []).some((entity) =>
      normalizeText(entity.description ?? '').includes(tokenLower)
    );
    const pagesHaveToken = (response.webDetection?.pagesWithMatchingImages ?? []).some((page) =>
      normalizeText(page.pageTitle ?? '').includes(tokenLower)
    );
    return score + (webHasToken || pagesHaveToken ? 1 : 0.4);
  }, 0);

  const priceEstimation = estimatePrice({
    bestCategory: bestCategory?.rule ?? null,
    categoryConfidence: confidence,
    conditionLevel,
    brandName,
    explicitPriceCandidates,
    pageTitlePriceCandidates,
    modelEvidenceScore,
  });

  const baseItemName = bestCategory?.rule.name ?? inferFallbackName(nonOcrLabels);
  const itemName = brandName && !normalizeText(baseItemName).includes(normalizeText(brandName))
    ? `${brandName} ${baseItemName}`
    : baseItemName;

  const utilityLevel = bestCategory?.rule.utilityLevel ?? 'medium';
  const descriptionParts: string[] = [];
  if (nonOcrLabels.length > 0) descriptionParts.push(`Detected: ${nonOcrLabels.slice(0, 4).join(', ')}`);
  if (brandName) descriptionParts.push(`Brand hint: ${brandName}`);
  if (extractedText) descriptionParts.push(`OCR: ${extractedText.split('\n').slice(0, 2).join(' ')}`);

  return {
    itemName,
    description: descriptionParts.join('. ').trim(),
    utilityLevel,
    conditionLevel,
    estimatedPrice: priceEstimation.estimatedPrice,
    estimatedPriceLow: priceEstimation.estimatedPriceLow,
    estimatedPriceHigh: priceEstimation.estimatedPriceHigh,
    confidence,
    priceConfidence: priceEstimation.priceConfidence,
    labels: nonOcrLabels.slice(0, 5),
    extractedText,
  };
};

export const analyzeImageWithGoogleVision = async (imageBase64: string): Promise<VisionAssistSuggestion> => {
  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision is not configured. Set EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY.');
  }

  const normalizedBase64 = stripDataUriPrefix(imageBase64).trim();
  if (!normalizedBase64) {
    throw new Error('Image data is missing for Vision analysis.');
  }

  const response = await fetch(`${GOOGLE_VISION_ENDPOINT}?key=${GOOGLE_VISION_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: normalizedBase64 },
          features: [
            { type: 'OBJECT_LOCALIZATION', maxResults: 12 },
            { type: 'LABEL_DETECTION', maxResults: 16 },
            { type: 'TEXT_DETECTION', maxResults: 12 },
            { type: 'WEB_DETECTION', maxResults: 10 },
            { type: 'LOGO_DETECTION', maxResults: 5 },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision request failed (${response.status}): ${errorText || 'Unknown error'}`);
  }

  const payload = (await response.json()) as AnnotateImageResponse;
  const firstResponse = payload.responses?.[0];
  if (!firstResponse) {
    throw new Error('Google Vision returned an empty response.');
  }

  if (firstResponse.error?.message) {
    throw new Error(`Google Vision error: ${firstResponse.error.message}`);
  }

  return buildSuggestion(firstResponse);
};
