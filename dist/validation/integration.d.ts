/**
 * Doubt-agent skill integration
 * Bridges the user-experience skill with doubt-agent validation agents
 */
import type { ValidationResult, PhaseFindings, RedFlag } from '../types';
/**
 * Run doubt-agent validation by invoking the /doubt skill
 * This integrates with the existing doubt-agent infrastructure
 */
export declare function validateWithDoubtAgents(input: {
    findings: PhaseFindings;
    redFlags: RedFlag[];
    toolPath: string;
}): Promise<ValidationResult>;
/**
 * Helper to invoke doubt-agent skill from command line
 * This is for integration when running as a CLI tool
 */
export declare function invokeDoubtAgentFromCLI(args: string[]): Promise<void>;
//# sourceMappingURL=integration.d.ts.map