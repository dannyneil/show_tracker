/**
 * Global AI Model Configuration
 *
 * Update these model IDs when new versions are released to upgrade across the entire app.
 */

export const AI_MODELS = {
  /**
   * Fast, cost-effective model for quick tasks
   * - Show summaries
   * - Quick recommendations
   * - General queries
   *
   * Current: Claude Sonnet 4.6
   */
  FAST: 'claude-sonnet-4-6-20250514',

  /**
   * Premium model for complex reasoning and important decisions
   * - Deep analysis with web search
   * - Critical decision-making (choosing shows to watch)
   * - Complex natural language queries
   *
   * Current: Claude Opus 4.6
   */
  EXPENSIVE: 'claude-opus-4-6-20250514',
} as const;

// Human-readable model names for display
export const AI_MODEL_NAMES = {
  [AI_MODELS.FAST]: 'Claude Sonnet 4.6',
  [AI_MODELS.EXPENSIVE]: 'Claude Opus 4.6',
} as const;

// Type for model selection
export type ModelType = typeof AI_MODELS[keyof typeof AI_MODELS];
