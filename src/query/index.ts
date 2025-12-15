/**
 * Notification Rule Language - Public API
 * 
 * Grammar-first DSL implementation using Peggy parser generator.
 * Admin-configurable notification rules for event reminders.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS (MIT 6.102):
 * - Little languages (domain-specific languages)
 * - Grammar as specification
 * - Parser generators (Peggy compiles grammar → parser)
 * - Declarative language design
 * - Abstract syntax trees (AST)
 * - Interpreter pattern (code as data)
 * 
 * EXAMPLE USAGE:
 * 
 * import { parse, evaluateRule } from './query';
 * 
 * // Parse DSL rule into AST
 * const ast = parse("SEND email, sms WHEN hours_until = 24 AND status = UPCOMING");
 * 
 * // Evaluate against event
 * const result = evaluateRule(ast, event);
 * if (result.shouldSend) {
 *   sendNotifications(result.channels);
 * }
 * 
 * // Validate rule syntax
 * try {
 *   parse(ruleText);
 *   console.log("✓ Valid rule");
 * } catch (error) {
 *   console.log("✗ Syntax error:", error.message);
 * }
 */

// Grammar and type definitions
export { 
  RuleChannel,
  RuleField,
  RuleOperator,
  EventStatus,
  isValidChannel,
  isValidField,
  isValidOperator
} from './grammar';

// Parser (generated from query.peggy grammar)
export { parse, SyntaxError } from './parser-generated';

// AST (abstract syntax tree)
export {
  ASTNode,
  Expression,
  RuleNode,
  BinaryNode,
  ConditionNode,
  createRuleNode,
  createBinaryNode,
  createConditionNode,
  printAST,
  validateAST,
  countNodes,
  getDepth
} from './ast';

// Interpreter (evaluation)
export {
  Interpreter,
  EvaluationContext,
  RuleEvaluationResult
} from './interpreter';

/**
 * Execute a query to filter events
 * 
 * @param query - Query string in our DSL (only the condition part)
 * @param events - Array of events to filter
 * @returns Object with filtered events and count
 * 
 * Example:
 *   executeQuery('status = UPCOMING', events)
 *   executeQuery('hours_until < 24 AND capacity > 100', events)
 */
export function executeQuery(query: string, events: any[]): { events: any[], count: number } {
  // Import the necessary functions and types
  const { parse } = require('./parser-generated');
  const { Interpreter } = require('./interpreter');
  
  // Parse the query by wrapping it in a SEND clause (we only care about the condition)
  const fullQuery = `SEND email WHEN ${query}`;
  const ast = parse(fullQuery);
  
  // Filter events based on the condition
  const filteredEvents = events.filter(event => {
    const result = Interpreter.evaluateRule(ast, event);
    return result.shouldSend;
  });
  
  return {
    events: filteredEvents,
    count: filteredEvents.length
  };
}

/**
 * Notification Rule Language Documentation
 * 
 * Domain-specific language for configuring automated event notifications.
 * Admins define WHEN to send notifications and through WHICH channels,
 * without writing code.
 * 
 * GRAMMAR:
 * --------
 * Rule         ::= 'SEND' ChannelList 'WHEN' Expression
 * ChannelList  ::= Channel (',' Channel)*
 * Channel      ::= 'email' | 'sms' | 'push'
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * FIELDS:
 * -------
 * Time-based:
 *   hours_until    - Hours until event starts (computed)
 *   minutes_until  - Minutes until event starts (computed)
 *   days_until     - Days until event starts (computed)
 * 
 * Event properties:
 *   status            - Event status (UPCOMING, CANCELLED, etc.)
 *   capacity          - Total event capacity
 *   available_seats   - Remaining seats
 *   price             - Event price
 *   title             - Event title
 * 
 * OPERATORS:
 * ----------
 * =          Equality
 * !=         Inequality
 * >, <       Greater/less than (numbers only)
 * >=, <=     Greater/less than or equal
 * 
 * LOGICAL OPERATORS:
 * ------------------
 * AND        Both conditions must be true (higher precedence)
 * OR         At least one condition must be true
 * ()         Grouping to override precedence
 * 
 * EXAMPLES:
 * ---------
 * 
 * 1. Email reminder 24 hours before:
 *    SEND email WHEN hours_until = 24
 * 
 * 2. Multi-channel reminder 1 hour before:
 *    SEND email, sms, push WHEN hours_until = 1
 * 
 * 3. Early reminder for large events:
 *    SEND email WHEN hours_until = 36 AND capacity > 100
 * 
 * 4. Last-minute push for events with seats:
 *    SEND push WHEN minutes_until = 30 AND available_seats > 0
 * 
 * 5. Multiple time reminders:
 *    SEND sms WHEN (hours_until = 24 OR hours_until = 1) AND status = UPCOMING
 * 
 * 6. Weekly reminder for paid events:
 *    SEND email WHEN days_until = 7 AND price > 0
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS DEMONSTRATED (MIT 6.102):
 * --------------------------------------------------------
 * 
 * 1. **Grammar**: Formal EBNF grammar defines language syntax
 *    - grammar.ts contains complete grammar specification
 *    - query.peggy is PEG (Parsing Expression Grammar) for Peggy generator
 * 
 * 2. **Little Languages**: Domain-specific, not general-purpose
 *    - Focused on notification rules only
 *    - No loops, variables, or general computation
 *    - Declarative: describes WHAT to do, not HOW
 * 
 * 3. **Parsing**: Grammar → Parser generator (Peggy) → Parser → AST
 *    - Input: "SEND email WHEN hours_until = 24"
 *    - Output: RuleNode with channels and condition tree
 * 
 * 4. **Abstract Syntax Trees**: Recursive data structure
 *    - RuleNode contains Expression
 *    - Expression contains BinaryNode or ConditionNode
 *    - BinaryNode contains left/right Expressions (recursion!)
 * 
 * 5. **Interpreter Pattern**: Code as data
 *    - Rules stored as text in database
 *    - Parsed into AST at runtime
 *    - Evaluated against events dynamically
 *    - No redeployment needed for rule changes
 * 
 * 6. **Separation of Syntax and Semantics**:
 *    - Grammar (syntax): query.peggy, grammar.ts
 *    - Meaning (semantics): interpreter.ts
 *    - Parser: converts text → AST (syntax only)
 *    - Interpreter: evaluates AST → result (semantics)
 * 
 * 7. **Recursive Data Types and Functions**:
 *    - Expression type is recursive (contains Expression)
 *    - evaluateExpression() is recursive function
 *    - Structural recursion: function mirrors data structure
 * 
 * 8. **Immutability**: AST nodes are readonly
 *    - Rules don't mutate during evaluation
 *    - Functional style: pure evaluation functions
 * 
 * 9. **Type Safety**: TypeScript discriminated unions
 *    - node.kind distinguishes node types
 *    - Exhaustiveness checking catches missing cases
 * 
 * 10. **Specifications**: Pre/postconditions documented
 *     - Example: createRuleNode() requires non-empty channels
 *     - Interpreter.evaluateRule() promises no side effects
 * 
 * ACADEMIC VALUE:
 * ---------------
 * This demonstrates all key concepts from MIT 6.102 Lecture 19 (Little Languages):
 * - Domain-specific language design
 * - Grammar-first approach
 * - Parser generators vs. hand-coded parsers
 * - Interpreter pattern for extensibility
 * - Separation of concerns (syntax vs. semantics)
 * 
 * PRACTICAL VALUE:
 * ----------------
 * - Admins configure timing without deployment
 * - Business logic lives in database, not code
 * - Easy to add new rules without touching code
 * - Testable: mock events, rules, and time
 * - Extensible: add fields by updating grammar + interpreter
 */
 

/** 
 * IMPLEMENTATION ARCHITECTURE:
 * ---------------------------
 * 
 * Text Query → Lexer → Tokens → Parser → AST → Interpreter → Results
 * 
 * Each stage is independent and can be tested/modified separately.
 * This follows the "code as data" principle where queries are
 * represented as data structures (AST) that can be manipulated.
 */
