/**
 * Event Query Language - Grammar Definition
 * 
 * This file defines the formal grammar for our domain-specific language (DSL)
 * used to query events in the CampusConnect system.
 * 
 * GRAMMAR (EBNF Notation):
 * ========================
 * 
 * Query        ::= Expression EOF
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * Field        ::= 'title' | 'status' | 'organizer' | 'venue' | 'date'
 * Operator     ::= '=' | '!=' | 'CONTAINS' | '>' | '<' | '>=' | '<='
 * Value        ::= STRING | DATE | NUMBER
 * 
 * STRING       ::= [a-zA-Z0-9_-]+
 * DATE         ::= [0-9]{4}-[0-9]{2}-[0-9]{2}
 * NUMBER       ::= [0-9]+
 * 
 * EXAMPLE QUERIES:
 * ===============
 * 
 * 1. Simple comparison:
 *    status = UPCOMING
 * 
 * 2. Multiple conditions with AND:
 *    status = UPCOMING AND venue = auditorium
 * 
 * 3. Multiple conditions with OR:
 *    status = UPCOMING OR status = INPROGRESS
 * 
 * 4. Complex nested query:
 *    (status = UPCOMING OR status = INPROGRESS) AND venue = auditorium
 * 
 * 5. Text search:
 *    title CONTAINS workshop
 * 
 * 6. Date comparisons:
 *    date > 2025-12-14 AND date < 2025-12-31
 * 
 * LANGUAGE DESIGN DECISIONS:
 * ==========================
 * 
 * 1. **Keyword-based syntax**: Uses familiar SQL-like keywords (AND, OR, CONTAINS)
 *    for better readability and lower learning curve.
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
