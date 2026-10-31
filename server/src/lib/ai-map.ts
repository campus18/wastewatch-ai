import type { Category } from './constants';

export interface Label { description: string; score: number }
export interface Interpretation {
  wasteRelated: boolean;
  wasteScore: number | null;
  matched: string[];
  suggestedCategory: Category | null;
}

const WASTE_TERMS = ['waste', 'trash', 'garbage', 'litter', 'rubbish', 'landfill', 'junk', 'dump', 'recycling', 'debris', 'scrap', 'plastic', 'bottle', 'bag'];
const CATEGORY_TERMS: [Category, string[]][] = [
  ['hazardous', ['hazardous', 'chemical', 'toxic', 'barrel', 'drum']],
  ['electronic', ['electronic', 'computer', 'circuit', 'cable', 'television', 'appliance']],
  ['construction', ['construction', 'rubble', 'brick', 'concrete', 'debris', 'cement']],
  ['organic', ['food', 'fruit', 'vegetable', 'compost', 'leaf', 'peel']],
  ['plastic', ['plastic', 'bottle', 'bag', 'packaging', 'polyethylene']],
];

/**
 * Maps provider labels to a *suggestion*. It only reflects what the provider returned:
 * no labels matched -> wasteRelated=false and wasteScore=null (no invented confidence).
 */
// Whole-word match (optional plural "s") so that e.g. "bag" does not match inside "garbage".
const hasTerm = (text: string, term: string) => new RegExp(`\\b${term}s?\\b`).test(text);

export function interpretLabels(labels: Label[]): Interpretation {
  const lower = labels.map((l) => ({ ...l, d: l.description.toLowerCase() }));
  const hits = lower.filter((l) => WASTE_TERMS.some((t) => hasTerm(l.d, t)));
  let suggestedCategory: Category | null = null;
  for (const [cat, terms] of CATEGORY_TERMS) {
    if (lower.some((l) => terms.some((t) => hasTerm(l.d, t)))) { suggestedCategory = cat; break; }
  }
  if (!suggestedCategory && hits.length) suggestedCategory = 'mixed';
  return {
    wasteRelated: hits.length > 0,
    wasteScore: hits.length ? Math.max(...hits.map((h) => h.score)) : null,
    matched: hits.map((h) => h.description),
    suggestedCategory,
  };
}
