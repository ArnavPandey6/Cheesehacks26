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

type VisionWebDetection = {
  webEntities?: VisionWebEntity[];
  bestGuessLabels?: VisionBestGuessLabel[];
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

export type VisionAssistSuggestion = {
  itemName: string;
  description: string;
  utilityLevel: UtilityLevel;
  conditionLevel: ConditionLevel;
  estimatedPrice: number;
  confidence: number;
  labels: string[];
  extractedText: string;
};

export const isVisionConfigured = Boolean(GOOGLE_VISION_API_KEY);

const categoryRules: CategoryRule[] = [
  {
    name: 'Laptop',
    utilityLevel: 'high',
    estimatedPriceRange: [250, 1200],
    keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'computer'],
  },
  {
    name: 'Monitor',
    utilityLevel: 'high',
    estimatedPriceRange: [60, 420],
    keywords: ['monitor', 'display', 'screen'],
    antiKeywords: ['television', 'tv'],
  },
  {
    name: 'Television',
    utilityLevel: 'high',
    estimatedPriceRange: [80, 700],
    keywords: ['television', 'tv', 'smart tv'],
  },
  {
    name: 'Office Chair',
    utilityLevel: 'high',
    estimatedPriceRange: [30, 220],
    keywords: ['office chair', 'chair', 'seat', 'desk chair'],
  },
  {
    name: 'Desk',
    utilityLevel: 'high',
    estimatedPriceRange: [40, 260],
    keywords: ['desk', 'workstation', 'computer desk', 'table'],
  },
  {
    name: 'Microwave',
    utilityLevel: 'high',
    estimatedPriceRange: [25, 170],
    keywords: ['microwave', 'microwave oven'],
  },
  {
    name: 'Mini Fridge',
    utilityLevel: 'high',
    estimatedPriceRange: [60, 320],
    keywords: ['mini fridge', 'refrigerator', 'fridge'],
  },
  {
    name: 'Vacuum',
    utilityLevel: 'high',
    estimatedPriceRange: [40, 380],
    keywords: ['vacuum', 'vacuum cleaner', 'cleaner'],
  },
  {
    name: 'Tool Set',
    utilityLevel: 'high',
    estimatedPriceRange: [15, 280],
    keywords: ['tool', 'toolbox', 'drill', 'screwdriver', 'wrench', 'hammer'],
  },
  {
    name: 'Printer',
    utilityLevel: 'medium',
    estimatedPriceRange: [30, 240],
    keywords: ['printer', 'scanner', 'inkjet', 'laser printer'],
  },
  {
    name: 'Router',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 180],
    keywords: ['router', 'modem', 'wifi router'],
  },
  {
    name: 'Keyboard',
    utilityLevel: 'medium',
    estimatedPriceRange: [10, 140],
    keywords: ['keyboard', 'mechanical keyboard'],
  },
  {
    name: 'Mouse',
    utilityLevel: 'medium',
    estimatedPriceRange: [8, 90],
    keywords: ['mouse', 'computer mouse'],
  },
  {
    name: 'Headphones',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 280],
    keywords: ['headphones', 'headset', 'earbuds'],
  },
  {
    name: 'Speaker',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 300],
    keywords: ['speaker', 'soundbar', 'subwoofer', 'bluetooth speaker'],
  },
  {
    name: 'Coffee Maker',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 180],
    keywords: ['coffee maker', 'espresso', 'keurig', 'coffee machine'],
  },
  {
    name: 'Air Fryer',
    utilityLevel: 'medium',
    estimatedPriceRange: [25, 160],
    keywords: ['air fryer'],
  },
  {
    name: 'Blender',
    utilityLevel: 'medium',
    estimatedPriceRange: [15, 120],
    keywords: ['blender'],
  },
  {
    name: 'Toaster',
    utilityLevel: 'medium',
    estimatedPriceRange: [10, 60],
    keywords: ['toaster', 'toaster oven'],
  },
  {
    name: 'Lamp',
    utilityLevel: 'medium',
    estimatedPriceRange: [10, 120],
    keywords: ['lamp', 'light', 'light fixture'],
  },
  {
    name: 'Shelf',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 180],
    keywords: ['shelf', 'bookcase', 'storage shelf'],
  },
  {
    name: 'Dresser',
    utilityLevel: 'medium',
    estimatedPriceRange: [40, 300],
    keywords: ['dresser', 'drawer', 'cabinet'],
  },
  {
    name: 'Sofa',
    utilityLevel: 'medium',
    estimatedPriceRange: [80, 700],
    keywords: ['sofa', 'couch', 'loveseat'],
  },
  {
    name: 'Mattress',
    utilityLevel: 'medium',
    estimatedPriceRange: [60, 500],
    keywords: ['mattress', 'bed'],
  },
  {
    name: 'Bicycle',
    utilityLevel: 'medium',
    estimatedPriceRange: [60, 900],
    keywords: ['bicycle', 'bike'],
  },
  {
    name: 'Suitcase',
    utilityLevel: 'low',
    estimatedPriceRange: [20, 220],
    keywords: ['suitcase', 'luggage'],
  },
  {
    name: 'Backpack',
    utilityLevel: 'low',
    estimatedPriceRange: [8, 120],
    keywords: ['backpack', 'bag'],
  },
  {
    name: 'Clothing',
    utilityLevel: 'low',
    estimatedPriceRange: [5, 80],
    keywords: ['shirt', 'jacket', 'pants', 'clothing', 'hoodie', 'dress', 'shoes'],
  },
  {
    name: 'Book',
    utilityLevel: 'low',
    estimatedPriceRange: [3, 40],
    keywords: ['book', 'textbook', 'novel'],
  },
  {
    name: 'Decor',
    utilityLevel: 'low',
    estimatedPriceRange: [5, 90],
    keywords: ['decor', 'vase', 'frame', 'ornament', 'art'],
  },
];

const newConditionKeywords = ['brand new', 'new in box', 'sealed', 'unused', 'mint', 'unopened'];
const wornConditionKeywords = ['broken', 'damaged', 'cracked', 'stained', 'worn', 'scratched', 'repair', 'parts only', 'rust'];
const goodConditionKeywords = ['good condition', 'working', 'works', 'clean', 'gently used', 'functional'];

const conditionPriceMultiplier: Record<ConditionLevel, number> = {
  new: 1.18,
  good: 1.0,
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

  const weight = clamp(rawWeight, 0.05, 2.2);
  const existing = map[text];
  if (existing) {
    if (weight > existing.weight) {
      map[text] = { text, weight, source };
    }
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

  const deduped = [...new Set(values.map((value) => Math.round(value * 100) / 100))];
  return deduped.sort((a, b) => a - b);
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
      if (ocrNormalized.includes(keyword)) {
        score += 1.15;
      }
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
    if (ocrNormalized.includes(brand)) {
      brandScores[brand] = (brandScores[brand] ?? 0) + 0.9;
    }
  }

  for (const token of tokens) {
    for (const brand of knownBrands) {
      if (!token.text.includes(brand)) continue;

      const sourceBoost = token.source === 'logo' ? 1.7 : token.source === 'web' ? 1.2 : 1;
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

const estimatePrice = (input: {
  bestCategory: CategoryRule | null;
  categoryConfidence: number;
  conditionLevel: ConditionLevel;
  brandName: string | null;
  explicitPriceCandidates: number[];
}) => {
  const range = input.bestCategory?.estimatedPriceRange ?? [15, 120];
  const [minRange, maxRange] = range;

  const modeledBase =
    minRange
    + (maxRange - minRange) * clamp(0.55 + input.categoryConfidence * 0.25, 0.35, 0.9);
  const conditionMultiplier = conditionPriceMultiplier[input.conditionLevel];
  const brandMultiplier = input.brandName
    ? (brandMultipliers[normalizeText(input.brandName)] ?? 1)
    : 1;

  const lowerBound = minRange * 0.35;
  const upperBound = maxRange * 1.55;
  let modeledPrice = clamp(modeledBase * conditionMultiplier * brandMultiplier, lowerBound, upperBound);

  if (input.explicitPriceCandidates.length > 0) {
    const plausible = input.explicitPriceCandidates.filter(
      (price) => price >= lowerBound * 0.6 && price <= upperBound * 1.4
    );
    const pool = plausible.length > 0 ? plausible : input.explicitPriceCandidates;
    const closestExplicit = pool.reduce((closest, candidate) =>
      Math.abs(candidate - modeledPrice) < Math.abs(closest - modeledPrice) ? candidate : closest,
    pool[0]);

    const explicitTrust = input.categoryConfidence >= 0.65
      ? 0.68
      : input.categoryConfidence >= 0.45
        ? 0.58
        : 0.46;

    modeledPrice = closestExplicit * explicitTrust + modeledPrice * (1 - explicitTrust);
  } else if (input.categoryConfidence < 0.35) {
    const conservative = minRange + (maxRange - minRange) * 0.38;
    modeledPrice = conservative * conditionMultiplier * brandMultiplier;
  }

  return Math.round(clamp(modeledPrice, 5, 5000));
};

const inferFallbackName = (labels: string[]) => {
  const firstLabel = labels.find((label) => label.length > 2) ?? 'Item';
  return titleCase(firstLabel);
};

const buildSuggestion = (response: VisionApiSingleResponse): VisionAssistSuggestion => {
  const tokenMap: Record<string, WeightedToken> = {};

  for (const object of response.localizedObjectAnnotations ?? []) {
    pushWeightedToken(
      tokenMap,
      object.name ?? '',
      clamp((object.score ?? 0.45) * 1.35, 0.1, 2),
      'object'
    );
  }

  for (const label of response.labelAnnotations ?? []) {
    pushWeightedToken(
      tokenMap,
      label.description ?? '',
      clamp(label.score ?? 0.4, 0.1, 1.5),
      'label'
    );
  }

  for (const entity of response.webDetection?.webEntities ?? []) {
    pushWeightedToken(
      tokenMap,
      entity.description ?? '',
      clamp((entity.score ?? 0.35) * 1.25, 0.08, 1.7),
      'web'
    );
  }

  for (const guess of response.webDetection?.bestGuessLabels ?? []) {
    pushWeightedToken(tokenMap, guess.label ?? '', 1.1, 'guess');
  }

  for (const logo of response.logoAnnotations ?? []) {
    pushWeightedToken(
      tokenMap,
      logo.description ?? '',
      clamp((logo.score ?? 0.6) * 1.6, 0.15, 2.2),
      'logo'
    );
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
  const categoryConfidence = clamp(topScore / 6.2, 0, 1);
  const confidence = clamp(
    categoryConfidence * 0.55 + scoreGap * 0.25 + signalStrength * 0.2,
    0.2,
    0.99
  );

  const nonOcrLabels = allTokens
    .filter((token) => token.source !== 'ocr')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6)
    .map((token) => token.text);

  const conditionLevel = inferCondition(`${extractedText} ${nonOcrLabels.join(' ')}`);
  const brandName = detectBrand(allTokens, extractedText);
  const explicitPriceCandidates = parsePriceCandidatesFromText(extractedText);

  const estimatedPrice = estimatePrice({
    bestCategory: bestCategory?.rule ?? null,
    categoryConfidence: confidence,
    conditionLevel,
    brandName,
    explicitPriceCandidates,
  });

  const baseItemName = bestCategory?.rule.name ?? inferFallbackName(nonOcrLabels);
  const itemName = brandName && !normalizeText(baseItemName).includes(normalizeText(brandName))
    ? `${brandName} ${baseItemName}`
    : baseItemName;

  const utilityLevel = bestCategory?.rule.utilityLevel ?? 'medium';
  const descriptionParts: string[] = [];
  if (nonOcrLabels.length > 0) {
    descriptionParts.push(`Detected: ${nonOcrLabels.slice(0, 4).join(', ')}`);
  }
  if (brandName) {
    descriptionParts.push(`Brand hint: ${brandName}`);
  }
  if (extractedText) {
    descriptionParts.push(`OCR: ${extractedText.split('\n').slice(0, 2).join(' ')}`);
  }

  return {
    itemName,
    description: descriptionParts.join('. ').trim(),
    utilityLevel,
    conditionLevel,
    estimatedPrice,
    confidence,
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
            { type: 'TEXT_DETECTION', maxResults: 10 },
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
