/**
 * Type declarations for Peggy-generated parser
 */

import { RuleNode } from './ast';

export interface SyntaxError extends Error {
  location: {
    start: { offset: number; line: number; column: number };
    end: { offset: number; line: number; column: number };
  };
  expected?: Array<{ type: string; value?: string }>;
  found?: string;
}

export function parse(input: string): RuleNode;
