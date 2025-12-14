/**
 * Event Query Language - Abstract Syntax Tree (AST)
 * 
 * Defines recursive data types for representing parsed queries.
 * The AST is a tree structure where each node represents a query component.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Recursive data types (Expression contains Expression)
 * - Abstract data types with operations
 * - Composite pattern for tree structure
 * - Immutability (readonly fields)
 * - Type safety with discriminated unions
 */

import { QueryField, QueryOperator } from './grammar';

/**
 * ASTNode: Base interface for all AST nodes
 * 
 * Represents: Abstract base type for visitor pattern
 * Design pattern: Composite pattern
 */
export interface ASTNode {
  readonly kind: string;
}

/**
 * Expression: Recursive data type for query expressions
 * 
 * Grammar: Expression ::= BinaryExpr | ComparisonExpr | FieldExpr
 * 
 * Invariant: Forms a tree (no cycles)
 * Invariant: Each node has a specific kind
 */
export type Expression = 
  | BinaryExpr
  | ComparisonExpr
  | FieldExpr;

/**
 * BinaryExpr: Logical operations (AND, OR)
 * 
 * Represents: expr1 AND expr2  OR  expr1 OR expr2
 * 
 * Invariant: operator in {'AND', 'OR'}
 * Invariant: left and right are valid expressions
 * 
 * Example: (status = UPCOMING) AND (venue = auditorium)
 *          BinaryExpr(AND, ComparisonExpr(...), ComparisonExpr(...))
 */
export interface BinaryExpr extends ASTNode {
  readonly kind: 'BinaryExpr';
  readonly operator: 'AND' | 'OR';
  readonly left: Expression;
  readonly right: Expression;
}

/**
 * ComparisonExpr: Field comparisons
 * 
 * Represents: field operator value
 * 
 * Invariant: field is a valid QueryField
 * Invariant: operator is a valid QueryOperator
 * Invariant: value matches expected type for field
 * 
 * Example: status = UPCOMING
 *          ComparisonExpr('status', '=', 'UPCOMING')
 */
export interface ComparisonExpr extends ASTNode {
  readonly kind: 'ComparisonExpr';
  readonly field: QueryField;
  readonly operator: QueryOperator;
  readonly value: string | number | Date;
}

/**
 * FieldExpr: Simple field reference (for future extension)
 * 
 * Represents: field name without comparison
 * 
 * Invariant: field is a valid QueryField
 * 
 * Example: status  (could be used for boolean fields)
 */
export interface FieldExpr extends ASTNode {
  readonly kind: 'FieldExpr';
  readonly field: QueryField;
}

/**
 * Factory functions for creating AST nodes
 * 
 * Design decision: Factory pattern ensures proper initialization
 * Benefit: Centralized validation and type checking
 */

/**
 * Creates a binary expression node
 * 
 * @param operator - Logical operator (AND/OR)
 * @param left - Left operand expression
 * @param right - Right operand expression
 * @returns New BinaryExpr node
 * 
 * Precondition: operator in {'AND', 'OR'}
 * Precondition: left and right are valid expressions
 * Postcondition: Returns immutable binary expression
 */
export function createBinaryExpr(
  operator: 'AND' | 'OR',
  left: Expression,
  right: Expression
): BinaryExpr {
  return {
    kind: 'BinaryExpr',
    operator,
    left,
    right
  };
}

/**
 * Creates a comparison expression node
 * 
 * @param field - Field name to compare
 * @param operator - Comparison operator
 * @param value - Value to compare against
 * @returns New ComparisonExpr node
 * 
 * Precondition: field is a valid QueryField
 * Precondition: operator is a valid QueryOperator
 * Precondition: value type matches field expectations
 * Postcondition: Returns immutable comparison expression
 */
export function createComparisonExpr(
  field: QueryField,
  operator: QueryOperator,
  value: string | number | Date
): ComparisonExpr {
  return {
    kind: 'ComparisonExpr',
    field,
    operator,
    value
  };
}

/**
 * Creates a field expression node
 * 
 * @param field - Field name
 * @returns New FieldExpr node
 * 
 * Precondition: field is a valid QueryField
 * Postcondition: Returns immutable field expression
 */
export function createFieldExpr(field: QueryField): FieldExpr {
  return {
    kind: 'FieldExpr',
    field
  };
}

/**
 * AST Utilities
 */

/**
 * Pretty-prints an AST for debugging
 * 
 * @param node - Root node to print
 * @param indent - Indentation level
 * @returns String representation of AST
 * 
 * Recursive function demonstrating recursion on recursive data types
 */
export function printAST(node: Expression, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  
  switch (node.kind) {
    case 'BinaryExpr':
      return `${spaces}BinaryExpr(${node.operator})\n` +
             `${printAST(node.left, indent + 1)}\n` +
             `${printAST(node.right, indent + 1)}`;
    
    case 'ComparisonExpr':
      return `${spaces}ComparisonExpr(${node.field} ${node.operator} ${node.value})`;
    
    case 'FieldExpr':
      return `${spaces}FieldExpr(${node.field})`;
    
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = node;
      return _exhaustive;
  }
}

/**
 * Validates AST structure
 * 
 * @param node - Root node to validate
 * @returns true if AST is well-formed
 * 
 * Specification:
 * - Checks kind field matches actual type
 * - Validates no null/undefined children
 * - Recursively validates sub-trees
 * 
 * Demonstrates: Structural recursion on recursive data types
 */
export function validateAST(node: Expression): boolean {
  switch (node.kind) {
    case 'BinaryExpr':
      if (!['AND', 'OR'].includes(node.operator)) {
        return false;
      }
      return validateAST(node.left) && validateAST(node.right);
    
    case 'ComparisonExpr':
      if (!node.field || !node.operator) {
        return false;
      }
      return true;
    
    case 'FieldExpr':
      return !!node.field;
    
    default:
      return false;
  }
}

/**
 * Counts nodes in AST
 * 
 * @param node - Root node
 * @returns Total number of nodes in tree
 * 
 * Demonstrates: Recursive computation on recursive data types
 * Time complexity: O(n) where n is number of nodes
 */
export function countNodes(node: Expression): number {
  switch (node.kind) {
    case 'BinaryExpr':
      return 1 + countNodes(node.left) + countNodes(node.right);
    
    case 'ComparisonExpr':
    case 'FieldExpr':
      return 1;
    
    default:
      return 0;
  }
}

/**
 * Gets maximum depth of AST
 * 
 * @param node - Root node
 * @returns Maximum depth from root to leaf
 * 
 * Demonstrates: Recursive computation with maximum
 * Time complexity: O(n)
 */
export function getDepth(node: Expression): number {
  switch (node.kind) {
    case 'BinaryExpr':
      return 1 + Math.max(getDepth(node.left), getDepth(node.right));
    
    case 'ComparisonExpr':
    case 'FieldExpr':
      return 1;
    
    default:
      return 0;
  }
}
