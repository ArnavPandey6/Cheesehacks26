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

type VisionTextAnnotation = {
  description?: string;
};

type AnnotateImageResponse = {
  responses?: Array<{
    labelAnnotations?: VisionLabel[];
    localizedObjectAnnotations?: VisionObject[];
    textAnnotations?: VisionTextAnnotation[];
    error?: { message?: string };
  }>;
};

type VisionApiSingleResponse = NonNullable<AnnotateImageResponse['responses']>[number];

type CategoryRule = {
  name: string;
  utilityLevel: UtilityLevel;
  estimatedPriceRange: [number, number];
  keywords: string[];
};

type ConditionRule = {
  conditionLevel: ConditionLevel;
  keywords: string[];
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
    estimatedPriceRange: [350, 1400],
    keywords: ['laptop', 'notebook', 'macbook', 'computer'],
  },
  {
    name: 'Monitor',
    utilityLevel: 'high',
    estimatedPriceRange: [80, 450],
    keywords: ['monitor', 'display', 'screen'],
  },
  {
    name: 'Office Chair',
    utilityLevel: 'high',
    estimatedPriceRange: [40, 250],
    keywords: ['office chair', 'chair', 'seat'],
  },
  {
    name: 'Desk',
    utilityLevel: 'high',
    estimatedPriceRange: [60, 350],
    keywords: ['desk', 'table', 'workstation'],
  },
  {
    name: 'Microwave',
    utilityLevel: 'high',
    estimatedPriceRange: [40, 200],
    keywords: ['microwave', 'oven'],
  },
  {
    name: 'Vacuum',
    utilityLevel: 'high',
    estimatedPriceRange: [60, 450],
    keywords: ['vacuum', 'cleaner'],
  },
  {
    name: 'Coffee Maker',
    utilityLevel: 'medium',
    estimatedPriceRange: [20, 180],
    keywords: ['coffee maker', 'espresso', 'coffee machine'],
  },
  {
    name: 'Lamp',
    utilityLevel: 'medium',
    estimatedPriceRange: [15, 120],
    keywords: ['lamp', 'light fixture'],
  },
  {
    name: 'Shelf',
    utilityLevel: 'medium',
    estimatedPriceRange: [25, 180],
    keywords: ['shelf', 'bookcase', 'cabinet'],
  },
  {
    name: 'Speaker',
    utilityLevel: 'medium',
    estimatedPriceRange: [25, 280],
    keywords: ['speaker', 'subwoofer', 'soundbar'],
  },
  {
    name: 'Backpack',
    utilityLevel: 'low',
    estimatedPriceRange: [10, 100],
    keywords: ['backpack', 'bag'],
  },
  {
    name: 'Decor',
    utilityLevel: 'low',
    estimatedPriceRange: [5, 80],
    keywords: ['decor', 'vase', 'frame', 'ornament'],
  },
];

const conditionRules: ConditionRule[] = [
  {
    conditionLevel: 'new',
    keywords: ['new', 'sealed', 'brand new', 'unused', 'mint'],
  },
  {
    conditionLevel: 'worn',
    keywords: ['damaged', 'broken', 'worn', 'scratched', 'stained', 'repair'],
  },
];

const normalizeText = (value: string) => value.trim().toLowerCase();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseNumericPrice = (rawText: string): number | null => {
  const normalized = rawText.replace(/,/g, '');
  const dollarMatch = normalized.match(/\$\s?(\d{1,4}(?:\.\d{1,2})?)/);
  if (dollarMatch?.[1]) {
    const parsed = Number.parseFloat(dollarMatch[1]);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 5000) return parsed;
  }

  const plainMatch = normalized.match(/\b(\d{2,4})(?:\.\d{1,2})?\b/);
  if (plainMatch?.[1]) {
    const parsed = Number.parseFloat(plainMatch[1]);
    if (Number.isFinite(parsed) && parsed >= 10 && parsed <= 5000) return parsed;
  }

  return null;
};

const computeRuleScore = (rule: CategoryRule, candidates: Array<{ text: string; score: number }>) => {
  let total = 0;

  for (const candidate of candidates) {
    for (const keyword of rule.keywords) {
      if (candidate.text.includes(keyword)) {
        total += candidate.score;
      }
    }
  }

  return total;
};

const inferConditionLevel = (combinedText: string): ConditionLevel => {
  for (const rule of conditionRules) {
    if (rule.keywords.some((keyword) => combinedText.includes(keyword))) {
      return rule.conditionLevel;
    }
  }

  if (combinedText.includes('good condition') || combinedText.includes('works')) return 'good';
  return 'good';
};

const inferUtilityFromLabelDensity = (labels: string[]): UtilityLevel => {
  const text = labels.join(' ');
  if (
    text.includes('laptop')
    || text.includes('computer')
    || text.includes('desk')
    || text.includes('chair')
    || text.includes('vacuum')
    || text.includes('appliance')
  ) {
    return 'high';
  }

  if (
    text.includes('lamp')
    || text.includes('shelf')
    || text.includes('speaker')
    || text.includes('kitchen')
  ) {
    return 'medium';
  }

  return 'low';
};

const inferFallbackName = (labels: string[]) => {
  const firstLabel = labels.find((label) => label.length > 2) ?? 'Item';
  return firstLabel
    .split(' ')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const buildSuggestion = (response: VisionApiSingleResponse): VisionAssistSuggestion => {
  const labels = (response.labelAnnotations ?? [])
    .map((entry) => ({
      text: normalizeText(entry.description ?? ''),
      score: clamp(entry.score ?? 0.5, 0.1, 1),
    }))
    .filter((entry) => Boolean(entry.text));

  const objects = (response.localizedObjectAnnotations ?? [])
    .map((entry) => ({
      text: normalizeText(entry.name ?? ''),
      score: clamp((entry.score ?? 0.5) * 1.1, 0.1, 1),
    }))
    .filter((entry) => Boolean(entry.text));

  const candidates = [...objects, ...labels];
  const extractedText = (response.textAnnotations?.[0]?.description ?? '').trim();
  const extractedTextNormalized = normalizeText(extractedText);

  let bestRule: CategoryRule | null = null;
  let bestRuleScore = 0;

  for (const rule of categoryRules) {
    const scoreFromCandidates = computeRuleScore(rule, candidates);
    const scoreFromText = rule.keywords.some((keyword) => extractedTextNormalized.includes(keyword)) ? 0.8 : 0;
    const score = scoreFromCandidates + scoreFromText;

    if (score > bestRuleScore) {
      bestRule = rule;
      bestRuleScore = score;
    }
  }

  const primaryLabels = candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.text);

  const inferredUtility = bestRule?.utilityLevel ?? inferUtilityFromLabelDensity(primaryLabels);
  const inferredCondition = inferConditionLevel(`${extractedTextNormalized} ${primaryLabels.join(' ')}`);

  const parsedPrice = parseNumericPrice(extractedText);
  const [minRange, maxRange] = bestRule?.estimatedPriceRange ?? [15, 120];
  const midpoint = Math.round((minRange + maxRange) / 2);
  const estimatedPrice = Math.round(clamp(parsedPrice ?? midpoint, 5, 5000));

  const itemName = bestRule?.name ?? inferFallbackName(primaryLabels);
  const confidence = clamp(
    bestRuleScore > 0
      ? bestRuleScore / 3
      : Math.max(...candidates.map((entry) => entry.score), 0.3),
    0,
    1
  );

  const descriptionParts: string[] = [];
  if (primaryLabels.length > 0) descriptionParts.push(`Detected: ${primaryLabels.slice(0, 3).join(', ')}`);
  if (extractedText) descriptionParts.push(`Text: ${extractedText.split('\n').slice(0, 2).join(' ')}`);

  return {
    itemName,
    description: descriptionParts.join('. ').trim(),
    utilityLevel: inferredUtility,
    conditionLevel: inferredCondition,
    estimatedPrice,
    confidence,
    labels: primaryLabels,
    extractedText,
  };
};

const stripDataUriPrefix = (value: string) => {
  const separatorIndex = value.indexOf(',');
  if (value.startsWith('data:') && separatorIndex > -1) {
    return value.slice(separatorIndex + 1);
  }
  return value;
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
            { type: 'OBJECT_LOCALIZATION', maxResults: 8 },
            { type: 'LABEL_DETECTION', maxResults: 12 },
            { type: 'TEXT_DETECTION', maxResults: 8 },
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
