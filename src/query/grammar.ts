/**
 * Notification Rule Language - Grammar Definition
 * 
 * This file defines the formal grammar for our domain-specific language (DSL)
 * used to configure automated event notifications in the Event Management System.
 * 
 * GRAMMAR (EBNF Notation):
 * ========================
 * 
 * Rule         ::= 'SEND' ChannelList 'WHEN' Expression
 * ChannelList  ::= Channel (',' Channel)*
 * Channel      ::= 'email' | 'sms' | 'push'
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * Field        ::= 'hours_until' | 'minutes_until' | 'days_until' | 
 *                  'status' | 'capacity' | 'available_seats' | 'price' | 'title'
 * Operator     ::= '=' | '!=' | '>' | '<' | '>=' | '<='
 * Value        ::= NUMBER | STATUS | STRING
 * 
 * STATUS       ::= 'UPCOMING' | 'CANCELLED' | 'INPROGRESS' | 'COMPLETED'
 * NUMBER       ::= [0-9]+
 * STRING       ::= [a-zA-Z0-9_-]+
 * 
 * EXAMPLE RULES:
 * ==============
 * 
 * 1. Simple reminder 24 hours before:
 *    SEND email WHEN hours_until = 24
 * 
 * 2. Multi-channel reminder 1 hour before:
 *    SEND email, sms WHEN hours_until = 1
 * 
 * 3. Conditional reminder for large events:
 *    SEND email, push WHEN hours_until = 36 AND capacity > 100
 * 
 * 4. Multiple time reminders:
 *    SEND sms WHEN (hours_until = 24 OR hours_until = 1) AND status = UPCOMING
 * 
 * 5. Early reminder for paid events:
 *    SEND email WHEN days_until = 7 AND price > 0
 * 
 * 6. Last minute reminder:
 *    SEND push WHEN minutes_until = 30 AND available_seats > 0
 * 
 * LANGUAGE DESIGN DECISIONS:
 * ==========================
 * 
 * 1. **Declarative syntax**: Uses clear SEND...WHEN structure making intent obvious
 *    - Admins describe *what* to do, not *how* to do it
 *    - Example: "SEND email WHEN hours_until = 24" is self-documenting
 * 
 * 2. **Time-based fields**: Three granularities (days, hours, minutes)
 *    - Computed at evaluation time: hours_until = (event_start - now) / 1 hour
 *    - Allows flexible timing without hardcoding
 * 
 * 3. **Multi-channel support**: Comma-separated channel list
 *    - Single rule can trigger multiple channels
 *    - Example: "SEND email, sms, push" sends all three
 * 
 * 4. **Boolean logic**: AND/OR for combining conditions
 *    - AND: All conditions must be true
 *    - OR: At least one condition must be true
 *    - Parentheses for grouping
 * 
 * 5. **Comparison operators**: Standard set (=, !=, >, <, >=, <=)
 *    - Familiar to anyone with programming experience
 *    - Type-safe: numeric operators only work with numbers
 * 
 * 6. **No loops or variables**: Intentionally limited scope
 *    - Little language principle: domain-specific, not general-purpose
 *    - Reduces complexity and potential for errors
 * 
 * OPERATOR PRECEDENCE:
 * ===================
 * 1. Parentheses (highest)
 * 2. Comparisons (=, !=, >, <, >=, <=)
 * 3. AND
 * 4. OR (lowest)
 * 
 * Example: A OR B AND C  ≡  A OR (B AND C)
 * 
 * SOFTWARE CONSTRUCTION BENEFITS:
 * ==============================
 * 
 * 1. **Separation of concerns**: Rules live in database, not code
 *    - Admins change rules without deployment
 *    - Developers don't touch business logic for timing changes
 * 
 * 2. **Testability**: Each rule is an independent unit
 *    - Can test: parse(rule) → AST → evaluate(AST, event) → result
 *    - Mock events and times for deterministic testing
 * 
 * 3. **Maintainability**: Grammar is the specification
 *    - Grammar file documents language precisely
 *    - Parser generator (Peggy) eliminates hand-coded parsing bugs
 * 
 * 4. **Extensibility**: Easy to add new fields or operators
 *    - Add field: Update grammar + interpreter.getFieldValue()
 *    - Add operator: Update grammar + interpreter.evaluateConditionNode()
 * 
 * ACADEMIC CONCEPTS DEMONSTRATED (MIT 6.102):
 * ===========================================
 * 
 * 1. **Grammar**: Formal specification using EBNF notation
 * 2. **Little languages**: Domain-specific language for notification rules
 * 3. **Parsing**: Grammar → Parser generator (Peggy) → Parser → AST
 * 4. **Interpretation**: AST → Interpreter → Evaluation result
 * 5. **Separation of syntax and semantics**: Grammar defines syntax, interpreter defines semantics
 * 
 * USAGE EXAMPLE:
 * ==============
 * 
 * Input (stored in database):
 *   "SEND email, sms WHEN hours_until = 24 AND status = UPCOMING"
 * 
 * Parse:
 *   → RuleNode { channels: ['email', 'sms'], condition: BinaryNode { ... } }
 * 
 * Evaluate against event:
 *   Event: { start_datetime: "2024-12-16T10:00", status: "UPCOMING", ... }
 *   Now: 2024-12-15T10:00
 *   hours_until = 24, status = "UPCOMING"
 *   Condition: 24 = 24 AND "UPCOMING" = "UPCOMING" → true
 * 
 * Result:
 *   { shouldSend: true, channels: ['email', 'sms'] }
 * 
 * Action:
 *   notificationService.sendEventReminder(event, channels)
 */

// Type definitions for grammar elements

export type RuleChannel = 'email' | 'sms' | 'push';

export type RuleField = 
  | 'hours_until'
  | 'minutes_until'
  | 'days_until'
  | 'status'
  | 'capacity'
  | 'available_seats'
  | 'price'
  | 'title';

export type RuleOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

export type EventStatus = 'UPCOMING' | 'CANCELLED' | 'INPROGRESS' | 'COMPLETED';

/**
 * Validates if a string is a valid channel
 */
export function isValidChannel(channel: string): channel is RuleChannel {
  return ['email', 'sms', 'push'].includes(channel);
}

/**
 * Validates if a string is a valid field
 */
export function isValidField(field: string): field is RuleField {
  return [
    'hours_until',
    'minutes_until',
    'days_until',
    'status',
    'capacity',
    'available_seats',
    'price',
    'title'
  ].includes(field);
}

/**
 * Validates if a string is a valid operator
 */
export function isValidOperator(operator: string): operator is RuleOperator {
  return ['=', '!=', '>', '<', '>=', '<='].includes(operator);
}
 * 
 * 2. **Recursive structure**: Expression grammar is recursive, allowing arbitrary
 *    nesting with parentheses for complex queries.
 * 
 * 3. **Type safety**: Grammar distinguishes between STRING, DATE, and NUMBER
 *    values, enabling compile-time validation.
 * 
 * 4. **Operator precedence**: AND binds tighter than OR (standard boolean logic),
 *    enforced by grammar production rules.
 * 
 * 5. **Extensibility**: New fields and operators can be added without changing
 *    the grammar structure.
 * 
 * FORMAL SEMANTICS:
 * =================
 * 
 * Preconditions:
 * - Input query string is well-formed according to grammar
 * - Field names reference valid event properties
 * - Values match the expected type for comparison
 * 
 * Postconditions:
 * - Returns AST representing query structure
 * - AST can be evaluated against event objects
 * - Evaluation returns boolean (event matches or not)
 * 
 * Invariants:
 * - AST nodes form a tree (no cycles)
 * - Each comparison node references exactly one field and one value
 * - AND/OR nodes have at least two children
 */

// This file serves as documentation for the grammar.
// Implementation files: lexer.ts, parser.ts, ast.ts, interpreter.ts

export const GRAMMAR_VERSION = '1.0.0';

export const SUPPORTED_FIELDS = [
  'title',
  'status', 
  'organizer',
  'venue',
  'date',
  'capacity'
] as const;

export const SUPPORTED_OPERATORS = [
  '=',
  '!=',
  'CONTAINS',
  '>',
  '<',
  '>=',
  '<='
] as const;

export type QueryField = typeof SUPPORTED_FIELDS[number];
export type QueryOperator = typeof SUPPORTED_OPERATORS[number];
