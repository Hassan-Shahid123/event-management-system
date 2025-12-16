
/**
 * Base interface for all AST nodes
 */
export interface ASTNode {
  readonly kind: string;
}

/**
 * Expression: Recursive data type for rule conditions
 * 
 * Grammar: Expression ::= BinaryNode | ConditionNode
 * 
 * Invariant: Forms a tree (no cycles)
 * Invariant: Each node has a specific kind
 */
export type Expression = BinaryNode | ConditionNode;

/**
 * RuleNode: Top-level notification rule
 * 
 * Represents: SEND EMAIL WHEN condition
 * 
 * Invariant: condition is a valid expression
 */
export interface RuleNode extends ASTNode {
  readonly kind: 'RuleNode';
  readonly condition: Expression;
}

/**
 * BinaryNode: Logical operations (AND, OR)
 * 
 * Represents: condition1 AND condition2  OR  condition1 OR condition2
 * 
 * Invariant: operator in {'AND', 'OR'}
 * Invariant: left and right are valid expressions
 * 
 * Example: (hours_until = 24) AND (status = UPCOMING)
 */
export interface BinaryNode extends ASTNode {
  readonly kind: 'BinaryNode';
  readonly operator: 'AND' | 'OR';
  readonly left: Expression;
  readonly right: Expression;
}

/**
 * ConditionNode: Field comparisons
 * 
 * Represents: field operator value
 * 
 * Invariant: field is a valid field name
 * Invariant: operator is a valid comparison operator
 * Invariant: value matches expected type for field
 * 
 * Example: hours_until = 24
 *          ConditionNode('hours_until', '=', 24)
 */
export interface ConditionNode extends ASTNode {
  readonly kind: 'ConditionNode';
  readonly field: string;
  readonly operator: string; // '=', '!=', '>', '<', '>=', '<='
  readonly value: string | number;
}

/**
 * Creates a rule node with channels and condition
 * 
 * @param channels - Array of notification channels
 * @param condition - Boolean condition expression
 * @returns New RuleNode
 * 
 * Precondition: channels is non-empty
 * Precondition: condition is a valid expression
 * Postcondition: Returns immutable rule node
 */
export function createRuleNode(condition: Expression): RuleNode {
  return {
    kind: 'RuleNode',
    condition
  };
}

/**
 * Creates a binary expression node (AND/OR)
 * 
 * @param operator - Logical operator
 * @param left - Left operand
 * @param right - Right operand
 * @returns New BinaryNode
 * 
 * Precondition: operator in {'AND', 'OR'}
 * Precondition: left and right are valid expressions
 * Postcondition: Returns immutable binary node
 */
export function createBinaryNode(
  operator: 'AND' | 'OR',
  left: Expression,
  right: Expression
): BinaryNode {
  if (operator !== 'AND' && operator !== 'OR') {
    throw new Error(`Invalid operator: ${operator}`);
  }
  
  return {
    kind: 'BinaryNode',
    operator,
    left,
    right
  };
}

/**
 * Creates a condition node (field comparison)
 * 
 * @param field - Field name
 * @param operator - Comparison operator
 * @param value - Value to compare against
 * @returns New ConditionNode
 * 
 * Precondition: field is a valid field name
 * Precondition: operator is a valid comparison operator
 * Precondition: value type matches field expectations
 * Postcondition: Returns immutable condition node
 */
export function createConditionNode(
  field: string,
  operator: string,
  value: string | number
): ConditionNode {
  const validOperators = ['=', '!=', '>', '<', '>=', '<='];
  if (!validOperators.includes(operator)) {
    throw new Error(`Invalid operator: ${operator}`);
  }
  
  return {
    kind: 'ConditionNode',
    field,
    operator,
    value
  };
}

/**
 * AST Utilities
 * ==============
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
export function printAST(node: RuleNode | Expression, indent: number = 0): string {
  const spaces = '  '.repeat(indent);
  
  if (node.kind === 'RuleNode') {
    return `${spaces}SEND EMAIL WHEN\n` +
           `${printAST(node.condition, indent + 1)}`;
  }
  
  switch (node.kind) {
    case 'BinaryNode':
      return `${spaces}${node.operator}\n` +
             `${printAST(node.left, indent + 1)}\n` +
             `${printAST(node.right, indent + 1)}`;
    
    case 'ConditionNode':
      return `${spaces}${node.field} ${node.operator} ${node.value}`;
    
    default:
      const _exhaustive: never = node;
      return _exhaustive;
  }
}

/**
 * Validates AST structure
 * 
 * @param node - Node to validate
 * @returns true if AST is well-formed
 * 
 * Demonstrates: Structural recursion on recursive data types
 */
export function validateAST(node: RuleNode | Expression): boolean {
  if (node.kind === 'RuleNode') {
    return validateAST(node.condition);
  }
  
  switch (node.kind) {
    case 'BinaryNode':
      if (!['AND', 'OR'].includes(node.operator)) {
        return false;
      }
      return validateAST(node.left) && validateAST(node.right);
    
    case 'ConditionNode':
      const validOperators = ['=', '!=', '>', '<', '>=', '<='];
      return !!node.field && validOperators.includes(node.operator);
    
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
 * Time complexity: O(n) where n is number of nodes
 */
export function countNodes(node: Expression): number {
  switch (node.kind) {
    case 'BinaryNode':
      return 1 + countNodes(node.left) + countNodes(node.right);
    
    case 'ConditionNode':
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
 * Time complexity: O(n)
 */
export function getDepth(node: Expression): number {
  switch (node.kind) {
    case 'BinaryNode':
      return 1 + Math.max(getDepth(node.left), getDepth(node.right));
    
    case 'ConditionNode':
      return 1;
    
    default:
      return 0;
  }
}
