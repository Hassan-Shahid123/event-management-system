/**
 * Event Query Language - Public API
 * 
 * Exports the complete query language implementation.
 * Provides a clean interface for using the little language.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Little languages (domain-specific languages)
 * - API design and abstraction
 * - Separation of concerns
 * - Information hiding (implementation details hidden)
 * 
 * USAGE EXAMPLE:
 * ==============
 * 
 * import { executeQuery, parseQuery, printAST } from './query';
 * 
 * // Execute query directly
 * const result = executeQuery(
 *   "status = UPCOMING AND capacity > 50",
 *   allEvents
 * );
 * 
 * // Or parse and inspect AST first
 * const ast = parseQuery("title CONTAINS workshop");
 * console.log(printAST(ast));
 * 
 * // Then evaluate
 * const interpreter = new Interpreter(allEvents);
 * const result = interpreter.evaluate(ast);
 */

// Grammar and type definitions
export { 
  GRAMMAR_VERSION, 
  SUPPORTED_FIELDS, 
  SUPPORTED_OPERATORS,
  QueryField,
  QueryOperator 
} from './grammar';

// Lexer (tokenization)
export { 
  Lexer, 
  Token, 
  TokenType 
} from './lexer';

// Parser (syntax analysis)
export { 
  Parser, 
  ParseError,
  parseQuery 
} from './parser';

// AST (abstract syntax tree)
export {
  Expression,
  BinaryExpr,
  ComparisonExpr,
  FieldExpr,
  createBinaryExpr,
  createComparisonExpr,
  createFieldExpr,
  printAST,
  validateAST,
  countNodes,
  getDepth
} from './ast';

// Interpreter (evaluation)
export {
  Interpreter,
  QueryResult,
  executeQuery
} from './interpreter';

/**
 * Query Language Documentation
 * 
 * The Event Query Language is a domain-specific language (DSL) for
 * filtering events in the CampusConnect system. It demonstrates the
 * "little languages" concept from software construction.
 * 
 * GRAMMAR:
 * --------
 * Query        ::= Expression EOF
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * FIELDS:
 * -------
 * title, status, organizer, venue, date, capacity
 * 
 * OPERATORS:
 * ----------
 * =          Equality
 * !=         Inequality
 * CONTAINS   Substring match (case-insensitive)
 * >, <       Greater/less than (numbers and dates)
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
 * 1. Find upcoming events:
 *    status = UPCOMING
 * 
 * 2. Find events in a specific venue:
 *    venue = auditorium AND status = UPCOMING
 * 
 * 3. Find large events:
 *    capacity > 100
 * 
 * 4. Find workshops or seminars:
 *    title CONTAINS workshop OR title CONTAINS seminar
 * 
 * 5. Complex query with grouping:
 *    (status = UPCOMING OR status = INPROGRESS) AND capacity > 50
 * 
 * 6. Date range query:
 *    date > 2025-12-14 AND date < 2025-12-31
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS DEMONSTRATED:
 * --------------------------------------------
 * 
 * 1. **Grammar**: Formal EBNF grammar defines the language syntax
 * 
 * 2. **Parsing**: Recursive descent parser converts text to AST
 * 
 * 3. **Little Languages**: Domain-specific language for event queries
 * 
 * 4. **Recursive Data Types**: AST nodes are recursively defined
 *    (Expression contains Expression)
 * 
 * 5. **Abstract Data Types**: Token, Expression, etc. with operations
 * 
 * 6. **Regular Expressions**: Used in lexer for pattern matching
 * 
 * 7. **Specifications**: Pre/postconditions on all major methods
 * 
 * 8. **Immutability**: AST nodes are readonly, queries don't mutate state
 * 
 * 9. **Type Safety**: TypeScript ensures type correctness at compile time
 * 
 * 10. **Separation of Concerns**: 
 *     - Lexer: tokenization
 *     - Parser: syntax analysis
 *     - Interpreter: evaluation
 * 
 * IMPLEMENTATION ARCHITECTURE:
 * ---------------------------
 * 
 * Text Query → Lexer → Tokens → Parser → AST → Interpreter → Results
 * 
 * Each stage is independent and can be tested/modified separately.
 * This follows the "code as data" principle where queries are
 * represented as data structures (AST) that can be manipulated.
 */
