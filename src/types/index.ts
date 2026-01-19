/**
 * Core type definitions for user-experience auditor
 */

export interface AuditOptions {
  /** Domain/use case context for the tool being audited */
  context?: string;
  /** Output path for the generated report */
  output: string;
  /** Whether to run doubt-agent validation */
  validation: boolean;
  /** License tier for feature gating */
  tier?: 'free' | 'pro' | 'enterprise';
  /** Enable verbose logging */
  verbose?: boolean;
}

export interface AuditResult {
  /** Path where the report was saved */
  outputPath: string;
  /** List of red flags discovered */
  redFlags: RedFlag[];
  /** Overall score (0-10) */
  score: number;
  /** Detailed findings from each phase */
  findings: PhaseFindings;
  /** Timestamp when audit completed */
  completedAt: Date;
}

export interface RedFlag {
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low';
  /** Category of the issue */
  category: string;
  /** Title of the red flag */
  title: string;
  /** Detailed description */
  description: string;
  /** Evidence supporting this flag */
  evidence: string[];
  /** Suggested fix */
  fix: string;
  /** Where in the codebase this was found */
  location?: string;
}

export interface PhaseFindings {
  /** Phase 1: First impressions */
  firstImpressions?: FirstImpressionsFindings;
  /** Phase 2: Installation test */
  installation?: InstallationFindings;
  /** Phase 3: Functionality check */
  functionality?: FunctionalityFindings;
  /** Phase 4: Data verification */
  verification?: VerificationFindings;
  /** Phase 5: Error handling test */
  errorHandling?: { redFlags: RedFlag[]; notes: string[] };
  /** Phase 6: Red flag detection */
  redFlagDetection?: { redFlags: RedFlag[]; notes: string[] };
}

export interface FirstImpressionsFindings {
  /** README exists and is visible */
  hasReadme: boolean;
  /** README quality score (0-10) */
  readmeScore: number;
  /** Installation instructions present */
  hasInstallInstructions: boolean;
  /** Code examples provided */
  hasExamples: boolean;
  /** Project description clarity */
  descriptionClarity: number;
  /** Overall first impression score */
  score: number;
  /** Notes and observations */
  notes: string[];
}

export interface InstallationFindings {
  /** Installation was attempted */
  attempted: boolean;
  /** Installation succeeded */
  success: boolean;
  /** Time taken to install (ms) */
  duration: number;
  /** Method used (npm, cargo, go get, etc) */
  method?: string;
  /** Errors encountered */
  errors: string[];
  /** Warnings encountered */
  warnings: string[];
  /** Overall installation score */
  score: number;
  /** Installation notes */
  notes: string[];
}

export interface FunctionalityFindings {
  /** Commands tested */
  commandsTested: CommandTest[];
  /** Successful executions */
  successfulExecutions: number;
  /** Failed executions */
  failedExecutions: number;
  /** Missing features (documented but not implemented) */
  missingFeatures: string[];
  /** Overall functionality score */
  score: number;
  /** Functionality notes */
  notes: string[];
}

export interface CommandTest {
  /** Command that was tested */
  command: string;
  /** Whether it succeeded */
  success: boolean;
  /** Output (first 500 chars) */
  output?: string;
  /** Error message if failed */
  error?: string;
  /** Duration in ms */
  duration: number;
}

export interface VerificationFindings {
  /** Claims that were verified */
  verifiedClaims: VerifiedClaim[];
  /** Claims that couldn't be verified */
  unverifiableClaims: string[];
  /** Data accuracy issues found */
  accuracyIssues: string[];
  /** Overall verification score */
  score: number;
  /** Verification notes */
  notes: string[];
}

export interface VerifiedClaim {
  /** The claim that was made */
  claim: string;
  /** Whether it was verified */
  verified: boolean;
  /** Source used for verification */
  source?: string;
  /** Expected value */
  expected?: string;
  /** Actual value */
  actual?: string;
  /** Match status */
  match?: 'exact' | 'partial' | 'none';
}

export interface PhaseResult {
  /** Phase identifier */
  phase: string;
  /** Whether phase completed successfully */
  success: boolean;
  /** Duration in milliseconds */
  duration: number;
  /** Findings from this phase */
  findings: any;
  /** Errors encountered */
  errors: string[];
}

export interface ValidationOptions {
  /** Enable doubt-agent validation */
  enableDoubtAgents: boolean;
  /** Minimum score threshold (0-10) */
  minScore: number;
  /** Number of validation cycles */
  cycles: number;
}

export interface ValidationResult {
  /** Whether validation passed */
  passed: boolean;
  /** Final score after validation */
  score: number;
  /** Validation feedback */
  feedback: string[];
  /** Red flags added during validation */
  additionalFlags: RedFlag[];
  /** Validation status */
  status: 'validated' | 'unverified' | 'failed';
  /** Individual cycle results */
  cycles: {
    doubtCritic?: CycleResult;
    doubtMetaCritic?: CycleResult;
    karen?: CycleResult;
  };
  /** Confidence level (0-1) */
  confidence: number;
  /** Timestamp when validation completed */
  validatedAt: Date;
  /** Whether validation was skipped */
  skipped: boolean;
  /** Error message if validation failed */
  error?: string;
}

export interface CycleResult {
  /** Cycle name */
  cycle: string;
  /** Score from this cycle (0-10) */
  score: number;
  /** Feedback from this cycle */
  feedback: string[];
  /** Red flags found in this cycle */
  redFlags: RedFlag[];
  /** Agent used for this cycle */
  agent: string;
  /** Duration in milliseconds */
  duration: number;
  /** Whether this cycle passed */
  passed: boolean;
}
