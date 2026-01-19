/**
 * Doubt-agent validation integration
 * Runs 3-cycle validation protocol on audit findings
 */
import type { ValidationResult, PhaseFindings, RedFlag } from '../types';
export interface ValidationInput {
    findings: PhaseFindings;
    redFlags: RedFlag[];
    toolPath: string;
}
/**
 * Run doubt-agent validation (3-cycle protocol)
 * 1. doubt-critic: Check for obvious errors
 * 2. doubt-meta-critic: Catch bias in critique
 * 3. Karen: Score evidence (target: ≥6/10)
 */
export declare function validateWithDoubtAgents(input: ValidationInput): Promise<ValidationResult>;
//# sourceMappingURL=doubt-agents.d.ts.map