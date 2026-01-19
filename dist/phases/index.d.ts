/**
 * Phase execution orchestration
 * Loads and executes individual audit phases
 */
import type { PhaseResult } from '../types';
/**
 * Run a single audit phase
 * Loads the phase prompt and executes via LLM
 */
export declare function runPhase(phaseId: string, context: Record<string, any>): Promise<PhaseResult>;
export type * from '../types';
//# sourceMappingURL=index.d.ts.map