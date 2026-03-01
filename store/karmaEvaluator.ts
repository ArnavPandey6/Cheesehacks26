type KarmaEvaluationInput = {
    itemName: string;
    itemDescription?: string;
    hasPhoto: boolean;
};

const CATEGORY_RULES: Array<{ terms: string[]; points: number }> = [
    { terms: ['dyson', 'vacuum', 'washer', 'dryer', 'fridge', 'refrigerator', 'appliance'], points: 18 },
    { terms: ['drill', 'tool', 'ladder', 'saw', 'wrench', 'screwdriver'], points: 14 },
    { terms: ['monitor', 'laptop', 'keyboard', 'router', 'speaker', 'electronics'], points: 16 },
    { terms: ['desk', 'chair', 'table', 'sofa', 'furniture', 'shelf'], points: 12 },
    { terms: ['lamp', 'decor', 'rug', 'curtain', 'frame'], points: 8 },
];

const QUALITY_BONUS_RULES: Array<{ terms: string[]; points: number }> = [
    { terms: ['new', 'sealed', 'unused', 'like new'], points: 12 },
    { terms: ['working', 'clean', 'good condition', 'excellent'], points: 8 },
    { terms: ['includes', 'with accessories', 'charger included', 'bit set'], points: 5 },
];

const QUALITY_PENALTY_RULES: Array<{ terms: string[]; points: number }> = [
    { terms: ['broken', 'damaged', 'cracked', 'not working'], points: 20 },
    { terms: ['missing parts', 'needs repair', 'stained'], points: 12 },
    { terms: ['old', 'worn', 'scratched'], points: 7 },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const scoreRules = (text: string, rules: Array<{ terms: string[]; points: number }>) => {
    let score = 0;
    for (const rule of rules) {
        if (rule.terms.some((term) => text.includes(term))) {
            score += rule.points;
        }
    }
    return score;
};

export const evaluateKarmaValue = (input: KarmaEvaluationInput) => {
    const itemName = input.itemName.trim().toLowerCase();
    const itemDescription = (input.itemDescription ?? '').trim().toLowerCase();
    const combinedText = `${itemName} ${itemDescription}`.trim();

    let score = 10;

    if (input.hasPhoto) score += 10;

    if (itemName.length >= 6) score += 4;
    if (itemName.length >= 15) score += 3;

    if (itemDescription.length >= 20) score += 4;
    if (itemDescription.length >= 60) score += 4;

    score += scoreRules(combinedText, CATEGORY_RULES);
    score += scoreRules(combinedText, QUALITY_BONUS_RULES);
    score -= scoreRules(combinedText, QUALITY_PENALTY_RULES);

    return clamp(Math.round(score), 5, 100);
};

export const deriveBorrowRequirement = (karmaValue: number) => {
    return clamp(Math.round(karmaValue * 0.45), 5, 60);
};
