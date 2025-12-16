/**
 * Notification Rule Language - Interpreter
 * 
 * Evaluates notification rule AST against events to determine if notifications should be sent.
 * Implements visitor pattern for AST traversal and condition evaluation.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS (MIT 6.102):
 * ==========================================
 * - Interpreter pattern (code as data - rules are data, not hardcoded logic)
 * - Visitor pattern for tree traversal
 * - Recursive evaluation on recursive data types
 * - Type-safe value comparisons
 * - Separation of parsing (grammar) and evaluation (this file)
 * 
 * Example:
 * Rule: "SEND email WHEN hours_until = 24 AND status = UPCOMING"
 * Event: { id: 1, start_datetime: "2024-12-16T10:00:00Z", status: "UPCOMING" }
 * Current time: 2024-12-15T10:00:00Z
 * Result: { shouldSend: true, channels: ['email'], reason: 'Rule matched' }
 */

import { RuleNode, Expression, BinaryNode, ConditionNode } from './ast';
import { Event } from '../types';

/**
 * Extended Event type with optional venue-related fields for rule evaluation
 */
export interface EventWithMetadata extends Event {
  capacity?: number;
  available_seats?: number;
  price?: number;
}

/**
 * EvaluationContext: Context data for rule evaluation
 * 
 * Contains event data and computed fields like hours_until
 */
export interface EvaluationContext {
  event: EventWithMetadata;
  now: Date;
  hours_until: number;
  minutes_until: number;
  days_until: number;
  status: string;
  capacity: number;
  available_seats: number;
  price: number;
  title: string;
}

/**
 * RuleEvaluationResult: Result of evaluating a rule against an event
 */
export interface RuleEvaluationResult {
  shouldSend: boolean;
  reason: string;
  ruleName?: string;
}

/**
 * Interpreter: Evaluates notification rules against events
 * 
 * Design pattern: Visitor pattern
 * - Each AST node type has a corresponding evaluation method
 * - Recursive structure of AST leads to recursive evaluation
 * 
 * Rep invariant: Evaluation is stateless and pure (no side effects)
 */
export class Interpreter {
  /**
   * Evaluates a rule and determines if notification should be sent
   * 
   * @param rule - Parsed rule AST
   * @param event - Event to evaluate against
   * @param now - Current time (for testing, defaults to now)
   * @returns Evaluation result with channels and reason
   * 
   * Specification:
   * - Creates evaluation context with event and computed fields
   * - Recursively evaluates rule conditions
   * - Returns channels to send if conditions match
   * 
   * Time complexity: O(depth of AST)
   */
  public static evaluateRule(
    rule: RuleNode,
    event: EventWithMetadata,
    now: Date = new Date()
  ): RuleEvaluationResult {
    const context = this.createContext(event, now);
    const conditionMatches = this.evaluateExpression(rule.condition, context);

    if (conditionMatches) {
      return {
        shouldSend: true,
        reason: 'Rule conditions matched'
      };
    }

    return {
      shouldSend: false,
      reason: 'Rule conditions did not match'
    };
  }

  /**
   * Creates evaluation context with computed fields
   * 
   * @param event - Event to create context for
   * @param now - Current time
   * @returns Evaluation context with all fields
   * 
   * Computed fields:
   * - hours_until: Hours from now until event starts
   * - minutes_until: Minutes from now until event starts
   * - days_until: Days from now until event starts
   */
  private static createContext(event: EventWithMetadata, now: Date): EvaluationContext {
    const eventStart = new Date(event.start_datetime);
    const msUntil = eventStart.getTime() - now.getTime();
    
    return {
      event,
      now,
      hours_until: Math.floor(msUntil / (1000 * 60 * 60)),
      minutes_until: Math.floor(msUntil / (1000 * 60)),
      days_until: Math.floor(msUntil / (1000 * 60 * 60 * 24)),
      status: event.status,
      capacity: event.capacity || 0,
      available_seats: event.available_seats || 0,
      price: event.price || 0,
      title: event.title
    };
  }

  /**
   * Recursively evaluates an expression against context
   * 
   * @param expr - Expression node to evaluate
   * @param context - Evaluation context with event data
   * @returns Boolean result of evaluation
   * 
   * Demonstrates: Structural recursion on recursive data types
   * 
   * Pattern: Each node type handled separately:
   * - BinaryNode: Recurse on children, combine with AND/OR
   * - ConditionNode: Compare field value with expected value
   * 
   * Time complexity: O(n) where n is number of nodes in AST
   */
  private static evaluateExpression(
    expr: Expression,
    context: EvaluationContext
  ): boolean {
    switch (expr.kind) {
      case 'BinaryNode':
        return this.evaluateBinaryNode(expr, context);
      
      case 'ConditionNode':
        return this.evaluateConditionNode(expr, context);
      
      default:
        const _exhaustive: never = expr;
        return _exhaustive;
    }
  }

  /**
   * Evaluates binary node (AND/OR)
   * 
   * @param node - Binary node to evaluate
   * @param context - Evaluation context
   * @returns Boolean result
   * 
   * AND: Both left and right must be true
   * OR: At least one of left or right must be true
   * 
   * Short-circuit evaluation:
   * - AND: If left is false, don't evaluate right
   * - OR: If left is true, don't evaluate right
   */
  private static evaluateBinaryNode(
    node: BinaryNode,
    context: EvaluationContext
  ): boolean {
    const leftResult = this.evaluateExpression(node.left, context);
    
    if (node.operator === 'AND') {
      // Short-circuit: if left is false, no need to check right
      if (!leftResult) return false;
      return this.evaluateExpression(node.right, context);
    } else if (node.operator === 'OR') {
      // Short-circuit: if left is true, no need to check right
      if (leftResult) return true;
      return this.evaluateExpression(node.right, context);
    }
    
    return false;
  }

  /**
   * Evaluates condition node (field comparison)
   * 
   * @param node - Condition node to evaluate
   * @param context - Evaluation context
   * @returns Boolean result of comparison
   * 
   * Supports operators: =, !=, >, <, >=, <=
   * Type-safe comparisons based on field type
   */
  private static evaluateConditionNode(
    node: ConditionNode,
    context: EvaluationContext
  ): boolean {
    // Get actual field value from context
    const fieldValue = this.getFieldValue(node.field, context);
    const expectedValue = node.value;

    // Perform comparison based on operator
    switch (node.operator) {
      case '=':
        return fieldValue === expectedValue;
      
      case '!=':
        return fieldValue !== expectedValue;
      
      case '>':
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue > expectedValue
          : false;
      
      case '<':
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue < expectedValue
          : false;
      
      case '>=':
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue >= expectedValue
          : false;
      
      case '<=':
        return typeof fieldValue === 'number' && typeof expectedValue === 'number'
          ? fieldValue <= expectedValue
          : false;
      
      default:
        return false;
    }
  }

  /**
   * Gets field value from context
   * 
   * @param field - Field name
   * @param context - Evaluation context
   * @returns Field value or undefined
   * 
   * Supports both event fields and computed fields
   */
  private static getFieldValue(
    field: string,
    context: EvaluationContext
  ): string | number | undefined {
    switch (field) {
      case 'hours_until':
        return context.hours_until;
      case 'minutes_until':
        return context.minutes_until;
      case 'days_until':
        return context.days_until;
      case 'status':
        return context.status;
      case 'capacity':
        return context.capacity;
      case 'available_seats':
        return context.available_seats;
      case 'price':
        return context.price;
      case 'title':
        return context.title;
      default:
        return undefined;
    }
  }

  /**
   * Validates if a rule is syntactically correct and can be evaluated
   * 
   * @param rule - Rule to validate
   * @returns Validation result with error message if invalid
   */
  public static validateRule(rule: RuleNode): { valid: boolean; error?: string } {
    // Check condition has valid fields
    const validationError = this.validateExpression(rule.condition);
    if (validationError) {
      return { valid: false, error: validationError };
    }

    return { valid: true };
  }

  /**
   * Validates expression recursively
   * 
   * @param expr - Expression to validate
   * @returns Error message if invalid, null if valid
   */
  private static validateExpression(expr: Expression): string | null {
    switch (expr.kind) {
      case 'BinaryNode':
        const leftError = this.validateExpression(expr.left);
        if (leftError) return leftError;
        const rightError = this.validateExpression(expr.right);
        if (rightError) return rightError;
        return null;
      
      case 'ConditionNode':
        const validFields = [
          'hours_until', 'minutes_until', 'days_until',
          'status', 'capacity', 'available_seats', 'price', 'title'
        ];
        if (!validFields.includes(expr.field)) {
          return `Invalid field: ${expr.field}`;
        }
        return null;
      
      default:
        return 'Unknown expression type';
    }
  }
}
