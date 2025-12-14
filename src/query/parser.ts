/**
 * Event Query Language - Parser
 * 
 * Converts token stream into Abstract Syntax Tree (AST).
 * Implements recursive descent parsing algorithm.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Recursive descent parsing
 * - Predictive parsing with lookahead
 * - Syntax-directed translation
 * - Error recovery
 * - Separation of concerns (lexical vs syntactic analysis)
 */

import { Token, TokenType } from './lexer';
import { 
  Expression, 
  createBinaryExpr, 
  createComparisonExpr 
} from './ast';
import { QueryField, QueryOperator } from './grammar';

/**
 * ParseError: Custom error type for parse failures
 * 
 * Contains position information for error reporting
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
    public token?: Token
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parser: Converts token stream to AST
 * 
 * Implements: Recursive descent parser
 * Strategy: Each grammar production becomes a method
 * 
 * Grammar reminder:
 * Query        ::= Expression EOF
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * Rep invariant:
 * - 0 <= current < tokens.length
 * - current points to next token to consume
 * - tokens array ends with EOF
 */
export class Parser {
  private tokens: Token[];
  private current: number = 0;

  /**
   * Creates a new parser for token stream
   * 
   * @param tokens - Array of tokens from lexer
   * 
   * Precondition: tokens.length > 0
   * Precondition: tokens[tokens.length - 1].type === TokenType.EOF
   * Postcondition: Parser ready to parse
   */
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parses the token stream into an AST
   * 
   * @returns Root expression node
   * @throws ParseError if syntax is invalid
   * 
   * Grammar: Query ::= Expression EOF
   * 
   * Precondition: tokens is valid token stream
   * Postcondition: Returns valid AST or throws ParseError
   * Postcondition: current === tokens.length - 1 (at EOF)
   */
  public parse(): Expression {
    try {
      const expr = this.parseExpression();
      
      // Expect EOF
      if (!this.isAtEnd()) {
        throw new ParseError(
          `Unexpected token: ${this.peek().value}`,
          this.peek().position,
          this.peek()
        );
      }
      
      return expr;
    } catch (error) {
      if (error instanceof ParseError) {
        throw error;
      }
      throw new ParseError(
        `Parse error: ${error}`,
        this.current < this.tokens.length ? this.tokens[this.current].position : 0
      );
    }
  }

  /**
   * Parses an expression (handles OR operations)
   * 
   * Grammar: Expression ::= AndExpr ( 'OR' AndExpr )*
   * 
   * This is left-associative:
   * A OR B OR C  =>  (A OR B) OR C
   * 
   * Postcondition: Returns expression node representing OR operations
   */
  private parseExpression(): Expression {
    let expr = this.parseAndExpr();

    // Handle OR operations (lower precedence)
    while (this.match(TokenType.OR)) {
      const right = this.parseAndExpr();
      expr = createBinaryExpr('OR', expr, right);
    }

    return expr;
  }

  /**
   * Parses AND expressions (higher precedence than OR)
   * 
   * Grammar: AndExpr ::= Condition ( 'AND' Condition )*
   * 
   * This is left-associative:
   * A AND B AND C  =>  (A AND B) AND C
   * 
   * Postcondition: Returns expression node representing AND operations
   */
  private parseAndExpr(): Expression {
    let expr = this.parseCondition();

    // Handle AND operations (higher precedence than OR)
    while (this.match(TokenType.AND)) {
      const right = this.parseCondition();
      expr = createBinaryExpr('AND', expr, right);
    }

    return expr;
  }

  /**
   * Parses a condition (comparison or grouped expression)
   * 
   * Grammar: Condition ::= Comparison | '(' Expression ')'
   * 
   * Uses lookahead to decide:
   * - If LPAREN: parse grouped expression
   * - Otherwise: parse comparison
   * 
   * Postcondition: Returns expression node
   */
  private parseCondition(): Expression {
    // Grouped expression: ( Expression )
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      
      if (!this.match(TokenType.RPAREN)) {
        throw new ParseError(
          'Expected closing parenthesis',
          this.peek().position,
          this.peek()
        );
      }
      
      return expr;
    }

    // Otherwise, parse comparison
    return this.parseComparison();
  }

  /**
   * Parses a comparison expression
   * 
   * Grammar: Comparison ::= Field Operator Value
   * 
   * Example: status = UPCOMING
   * 
   * Precondition: Current token is a field name
   * Postcondition: Returns comparison expression node
   * 
   * @throws ParseError if syntax is invalid
   */
  private parseComparison(): Expression {
    // Parse field
    if (!this.check(TokenType.FIELD)) {
      throw new ParseError(
        `Expected field name, got: ${this.peek().value}`,
        this.peek().position,
        this.peek()
      );
    }
    
    const fieldToken = this.advance();
    const field = fieldToken.value as QueryField;

    // Parse operator
    const operator = this.parseOperator();

    // Parse value
    const value = this.parseValue();

    return createComparisonExpr(field, operator, value);
  }

  /**
   * Parses a comparison operator
   * 
   * @returns Operator string
   * @throws ParseError if not a valid operator
   * 
   * Postcondition: Current token advanced past operator
   */
  private parseOperator(): QueryOperator {
    const token = this.peek();

    let operator: QueryOperator;

    switch (token.type) {
      case TokenType.EQUALS:
        operator = '=';
        break;
      case TokenType.NOT_EQUALS:
        operator = '!=';
        break;
      case TokenType.CONTAINS:
        operator = 'CONTAINS';
        break;
      case TokenType.GREATER:
        operator = '>';
        break;
      case TokenType.LESS:
        operator = '<';
        break;
      case TokenType.GREATER_EQ:
        operator = '>=';
        break;
      case TokenType.LESS_EQ:
        operator = '<=';
        break;
      default:
        throw new ParseError(
          `Expected operator, got: ${token.value}`,
          token.position,
          token
        );
    }

    this.advance();
    return operator;
  }

  /**
   * Parses a value (string, number, or date)
   * 
   * @returns Parsed value with appropriate type
   * @throws ParseError if not a valid value token
   * 
   * Type conversion:
   * - DATE tokens -> Date objects
   * - NUMBER tokens -> numbers
   * - STRING tokens -> strings
   * 
   * Postcondition: Current token advanced past value
   */
  private parseValue(): string | number | Date {
    const token = this.peek();

    switch (token.type) {
      case TokenType.DATE:
        this.advance();
        return new Date(token.value);
      
      case TokenType.NUMBER:
        this.advance();
        return parseInt(token.value, 10);
      
      case TokenType.STRING:
        this.advance();
        return token.value;
      
      default:
        throw new ParseError(
          `Expected value, got: ${token.value}`,
          token.position,
          token
        );
    }
  }

  /**
   * Parser helper methods
   * 
   * These implement common parsing patterns:
   * - match: consume token if it matches type
   * - check: test token type without consuming
   * - advance: consume current token
   * - peek: look at current token
   * - isAtEnd: check if at EOF
   */

  /**
   * Checks if current token matches type and consumes it
   * 
   * @param type - Token type to match
   * @returns true if matched and consumed
   * 
   * Postcondition: If returns true, current advanced by 1
   */
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  /**
   * Checks if current token matches type (no consumption)
   * 
   * @param type - Token type to check
   * @returns true if current token has this type
   */
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  /**
   * Consumes and returns current token
   * 
   * @returns Current token
   * 
   * Precondition: !isAtEnd()
   * Postcondition: current incremented by 1
   */
  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current++;
    }
    return this.previous();
  }

  /**
   * Returns current token without consuming
   * 
   * @returns Current token
   */
  private peek(): Token {
    return this.tokens[this.current];
  }

  /**
   * Returns previous token
   * 
   * @returns Previous token
   */
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  /**
   * Checks if at end of token stream
   * 
   * @returns true if current token is EOF
   */
  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  /**
   * Rep invariant checker
   * 
   * @returns true if invariant holds
   */
  public checkRep(): boolean {
    if (this.current < 0 || this.current >= this.tokens.length) {
      return false;
    }
    
    if (this.tokens.length === 0) {
      return false;
    }
    
    if (this.tokens[this.tokens.length - 1].type !== TokenType.EOF) {
      return false;
    }
    
    return true;
  }
}

/**
 * Convenience function: Parse query string directly
 * 
 * @param query - Query string
 * @returns AST representing the query
 * @throws ParseError if query is invalid
 * 
 * Example:
 * const ast = parseQuery("status = UPCOMING AND venue = auditorium");
 */
export function parseQuery(query: string): Expression {
  const { Lexer } = require('./lexer');
  const lexer = new Lexer(query);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}
