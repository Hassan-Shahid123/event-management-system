/**
 * Event Query Language - Interpreter
 * 
 * Evaluates AST against event objects to filter/match events.
 * Implements visitor pattern for AST traversal.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Interpreter pattern (code as data)
 * - Visitor pattern for tree traversal
 * - Recursive evaluation on recursive data types
 * - Type-safe value comparisons
 * - Separation of parsing and evaluation
 */

import { Expression } from './ast';
import { Event } from '../types';

/**
 * QueryResult: Result of evaluating a query
 * 
 * Contains matched events and evaluation metadata
 */
export interface QueryResult {
  events: Event[];
  matched: number;
  total: number;
  executionTimeMs: number;
}

/**
 * Interpreter: Evaluates queries against events
 * 
 * Design pattern: Visitor pattern
 * - Each AST node type has a corresponding evaluation method
 * - Recursive structure of AST leads to recursive evaluation
 * 
 * Rep invariant: events array is immutable during evaluation
 */
export class Interpreter {
  private events: Event[];

  /**
   * Creates a new interpreter
   * 
   * @param events - Events to query against
   * 
   * Precondition: events !== null
   * Postcondition: Interpreter ready to evaluate queries
   */
  constructor(events: Event[]) {
    this.events = events;
  }

  /**
   * Evaluates a query and returns matching events
   * 
   * @param ast - Query AST from parser
   * @returns Query result with matched events
   * 
   * Specification:
   * - Evaluates AST against all events
   * - Returns events where AST evaluates to true
   * - Tracks execution time for performance monitoring
   * 
   * Postcondition: Result contains events matching query
   * Postcondition: events array unchanged (immutable)
   */
  public evaluate(ast: Expression): QueryResult {
    const startTime = Date.now();

    const matchedEvents = this.events.filter(event => 
      this.evaluateExpression(ast, event)
    );

    const executionTimeMs = Date.now() - startTime;

    return {
      events: matchedEvents,
      matched: matchedEvents.length,
      total: this.events.length,
      executionTimeMs
    };
  }

  /**
   * Recursively evaluates an expression against an event
   * 
   * @param expr - Expression node to evaluate
   * @param event - Event to evaluate against
   * @returns Boolean result of evaluation
   * 
   * Demonstrates: Structural recursion on recursive data types
   * 
   * Pattern: Each node type handled separately:
   * - BinaryExpr: Recurse on children, combine with operator
   * - ComparisonExpr: Compare field value with query value
   * - FieldExpr: Check field existence (future use)
   * 
   * Time complexity: O(depth of AST)
   */
  private evaluateExpression(expr: Expression, event: Event): boolean {
    switch (expr.kind) {
      case 'BinaryExpr':
        return this.evaluateBinaryExpr(expr, event);
      
      case 'ComparisonExpr':
        return this.evaluateComparisonExpr(expr, event);
      
      case 'FieldExpr':
        // Field existence check (not currently used in grammar)
        return this.hasField(event, expr.field);
      
      default:
        // TypeScript exhaustiveness check
        const _exhaustive: never = expr;
        return false;
    }
  }

  /**
   * Evaluates binary expression (AND/OR)
   * 
   * @param expr - Binary expression node
   * @param event - Event to evaluate against
   * @returns Boolean result
   * 
   * Semantics:
   * - AND: Both children must be true
   * - OR: At least one child must be true
   * 
   * Short-circuit evaluation:
   * - AND: Stop if left is false
   * - OR: Stop if left is true
   * 
   * Demonstrates: Recursive evaluation
   */
  private evaluateBinaryExpr(expr: Expression & { kind: 'BinaryExpr' }, event: Event): boolean {
    const leftResult = this.evaluateExpression(expr.left, event);

    // Short-circuit evaluation
    if (expr.operator === 'AND' && !leftResult) {
      return false;
    }
    if (expr.operator === 'OR' && leftResult) {
      return true;
    }

    const rightResult = this.evaluateExpression(expr.right, event);

    return expr.operator === 'AND' 
      ? leftResult && rightResult
      : leftResult || rightResult;
  }

  /**
   * Evaluates comparison expression
   * 
   * @param expr - Comparison expression node
   * @param event - Event to evaluate against
   * @returns Boolean result of comparison
   * 
   * Handles different operators:
   * - =, !=: Equality/inequality
   * - CONTAINS: Substring matching (case-insensitive)
   * - <, >, <=, >=: Numeric/date comparisons
   * 
   * Type handling:
   * - Converts event field values to appropriate types
   * - Handles dates, numbers, and strings
   * - Case-insensitive string comparisons
   */
  private evaluateComparisonExpr(expr: Expression & { kind: 'ComparisonExpr' }, event: Event): boolean {
    // Get field value from event
    const fieldValue = this.getFieldValue(event, expr.field);
    
    if (fieldValue === undefined || fieldValue === null) {
      return false;
    }

    const queryValue = expr.value;
    const operator = expr.operator;

    // Type-specific comparisons
    switch (operator) {
      case '=':
        return this.equals(fieldValue, queryValue);
      
      case '!=':
        return !this.equals(fieldValue, queryValue);
      
      case 'CONTAINS':
        return this.contains(fieldValue, queryValue);
      
      case '>':
        return this.greaterThan(fieldValue, queryValue);
      
      case '<':
        return this.lessThan(fieldValue, queryValue);
      
      case '>=':
        return this.greaterThan(fieldValue, queryValue) || this.equals(fieldValue, queryValue);
      
      case '<=':
        return this.lessThan(fieldValue, queryValue) || this.equals(fieldValue, queryValue);
      
      default:
        return false;
    }
  }

  /**
   * Gets field value from event object
   * 
   * @param event - Event object
   * @param field - Field name
   * @returns Field value or undefined
   * 
   * Maps query field names to event object properties:
   * - title -> event.title
   * - status -> event.status
   * - organizer -> event.organizer_id
   * - venue -> event.venue_id
   * - date -> event.start_datetime
   * - capacity -> (not directly on Event, would need venue lookup)
   */
  private getFieldValue(event: Event, field: string): any {
    switch (field.toLowerCase()) {
      case 'title':
        return event.title;
      case 'status':
        return event.status;
      case 'organizer':
        return event.organizer_id;
      case 'venue':
        return event.venue_id;
      case 'date':
        return event.start_datetime;
      case 'capacity':
        // Note: capacity is on Venue, not Event
        // For now, return undefined - would need venue join in real implementation
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Comparison helper methods
   * 
   * These handle type conversions and comparisons
   * Support: strings, numbers, dates
   */

  /**
   * Equality comparison (case-insensitive for strings)
   */
  private equals(fieldValue: any, queryValue: any): boolean {
    if (typeof fieldValue === 'string' && typeof queryValue === 'string') {
      return fieldValue.toLowerCase() === queryValue.toLowerCase();
    }
    
    if (fieldValue instanceof Date && queryValue instanceof Date) {
      return fieldValue.getTime() === queryValue.getTime();
    }
    
    return fieldValue === queryValue;
  }

  /**
   * Substring containment (case-insensitive)
   */
  private contains(fieldValue: any, queryValue: any): boolean {
    const fieldStr = String(fieldValue).toLowerCase();
    const queryStr = String(queryValue).toLowerCase();
    return fieldStr.includes(queryStr);
  }

  /**
   * Greater-than comparison (numbers and dates)
   */
  private greaterThan(fieldValue: any, queryValue: any): boolean {
    if (fieldValue instanceof Date && queryValue instanceof Date) {
      return fieldValue.getTime() > queryValue.getTime();
    }
    
    if (typeof fieldValue === 'number' && typeof queryValue === 'number') {
      return fieldValue > queryValue;
    }
    
    // Try numeric comparison
    const fieldNum = Number(fieldValue);
    const queryNum = Number(queryValue);
    if (!isNaN(fieldNum) && !isNaN(queryNum)) {
      return fieldNum > queryNum;
    }
    
    return false;
  }

  /**
   * Less-than comparison (numbers and dates)
   */
  private lessThan(fieldValue: any, queryValue: any): boolean {
    if (fieldValue instanceof Date && queryValue instanceof Date) {
      return fieldValue.getTime() < queryValue.getTime();
    }
    
    if (typeof fieldValue === 'number' && typeof queryValue === 'number') {
      return fieldValue < queryValue;
    }
    
    // Try numeric comparison
    const fieldNum = Number(fieldValue);
    const queryNum = Number(queryValue);
    if (!isNaN(fieldNum) && !isNaN(queryNum)) {
      return fieldNum < queryNum;
    }
    
    return false;
  }

  /**
   * Checks if event has a field
   */
  private hasField(event: Event, field: string): boolean {
    return this.getFieldValue(event, field) !== undefined;
  }
}

/**
 * Convenience function: Execute query string directly
 * 
 * @param query - Query string
 * @param events - Events to query
 * @returns Query result
 * 
 * Example:
 * const result = executeQuery(
 *   "status = UPCOMING AND venue = auditorium",
 *   allEvents
 * );
 * console.log(`Found ${result.matched} events in ${result.executionTimeMs}ms`);
 * 
 * Demonstrates: End-to-end query execution
 * - Lexical analysis (tokenization)
 * - Syntax analysis (parsing)
 * - Semantic analysis (evaluation)
 */
export function executeQuery(query: string, events: Event[]): QueryResult {
  const { parse } = require('./parser-generated');
  const ast = parse(query);
  const interpreter = new Interpreter(events);
  return interpreter.evaluate(ast);
}
