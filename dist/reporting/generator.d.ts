/**
 * Report generation from audit findings
 * Uses Handlebars template for markdown output
 */
import type { AuditOptions } from '../types';
export interface ReportData {
    toolPath: string;
    findings: any;
    redFlags: any[];
    score: number;
    options: AuditOptions;
    completedAt: Date;
}
/**
 * Generate audit report from findings
 */
export declare function generateReport(data: ReportData, outputPath: string): Promise<string>;
export type * from '../types';
//# sourceMappingURL=generator.d.ts.map