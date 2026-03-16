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
   * Current: Claude Sonnet 4 (May 2025)
   * Upgrade when available: Sonnet 4.6 or newer
   */
  FAST: 'claude-sonnet-4-20250514',

  /**
   * Premium model for complex reasoning and important decisions
   * - Deep analysis with web search
   * - Critical decision-making (choosing shows to watch)
   * - Complex natural language queries
   *
   * Current: Claude Opus 4.5 (November 2025)
   * Upgrade when available: Opus 4.6 or newer
   */
  EXPENSIVE: 'claude-opus-4-5-20251101',
} as const;

// Type for model selection
export type ModelType = typeof AI_MODELS[keyof typeof AI_MODELS];
