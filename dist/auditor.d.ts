/**
 * Core auditor orchestrating all 6 phases of UX audit
 */
import type { AuditOptions, AuditResult } from './types';
/**
 * Main audit orchestration function
 * Runs all 6 phases and generates final report
 */
export declare function auditTool(toolPath: string, options: AuditOptions): Promise<AuditResult>;
export type * from './types';
//# sourceMappingURL=auditor.d.ts.map