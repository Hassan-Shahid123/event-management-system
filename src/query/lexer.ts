/**
 * Event Query Language - Lexer (Tokenization)
 * 
 * Converts input query strings into a stream of tokens for parsing.
 * Implements lexical analysis using regular expressions.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Regular expressions for pattern matching
 * - Finite state machine (implicitly in regex engine)
 * - Tokenization separates syntax from semantics
 * - Static type checking with TypeScript enums
 */

/**
 * Token types recognized by the lexer
 * 
 * Represents: ADT (Abstract Data Type) for token classification
 * Invariant: Each token has exactly one type
 */
export enum TokenType {
  // Logical operators
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Comparison operators
  EQUALS = 'EQUALS',          // =
  NOT_EQUALS = 'NOT_EQUALS',  // !=
  CONTAINS = 'CONTAINS',
  GREATER = 'GREATER',        // >
  LESS = 'LESS',             // <
  GREATER_EQ = 'GREATER_EQ',  // >=
  LESS_EQ = 'LESS_EQ',       // <=
  
  // Grouping
  LPAREN = 'LPAREN',         // (
  RPAREN = 'RPAREN',         // )
  
  // Values
  FIELD = 'FIELD',           // field names (title, status, etc.)
  STRING = 'STRING',         // string literals
  NUMBER = 'NUMBER',         // numeric literals
  DATE = 'DATE',             // date literals (YYYY-MM-DD)
  
  // Special
  EOF = 'EOF',               // end of input
  INVALID = 'INVALID'        // lexical error
}

/**
 * Token: Represents a lexical unit with position information
 * 
 * Specification:
 * - type: classification of token
 * - value: raw text from input
 * - position: character offset for error reporting
 * 
 * Invariant: position >= 0
 * Invariant: value.length > 0 (except for EOF)
 */
export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Lexer: Converts string input into token stream
 * 
 * Design pattern: Iterator pattern (returns tokens one at a time)
 * 
 * Rep invariant:
 * - 0 <= current <= input.length
 * - tokens array contains all recognized tokens
 */
export class Lexer {
  private input: string;
  private current: number = 0;
  private tokens: Token[] = [];

  /**
   * Creates a new lexer for the given input
   * 
   * @param input - Query string to tokenize
   * 
   * Precondition: input !== null
   * Postcondition: lexer ready to produce tokens
   */
  constructor(input: string) {
    this.input = input.trim();
  }

  /**
   * Tokenizes the entire input string
   * 
   * @returns Array of tokens including EOF
   * 
   * Precondition: lexer not yet tokenized
   * Postcondition: tokens array populated, ends with EOF
   * Postcondition: current === input.length
   */
  public tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.skipWhitespace();
      if (this.isAtEnd()) break;

      const start = this.current;
      const char = this.peek();

      // Two-character operators
      if (char === '!' && this.peekNext() === '=') {
        this.advance();
        this.advance();
        this.addToken(TokenType.NOT_EQUALS, '!=', start);
        continue;
      }

      if (char === '>' && this.peekNext() === '=') {
        this.advance();
        this.advance();
        this.addToken(TokenType.GREATER_EQ, '>=', start);
        continue;
      }

      if (char === '<' && this.peekNext() === '=') {
        this.advance();
        this.advance();
        this.addToken(TokenType.LESS_EQ, '<=', start);
        continue;
      }

      // Single-character operators
      switch (char) {
        case '(':
          this.advance();
          this.addToken(TokenType.LPAREN, '(', start);
          break;
        case ')':
          this.advance();
          this.addToken(TokenType.RPAREN, ')', start);
          break;
        case '=':
          this.advance();
          this.addToken(TokenType.EQUALS, '=', start);
          break;
        case '>':
          this.advance();
          this.addToken(TokenType.GREATER, '>', start);
          break;
        case '<':
          this.advance();
          this.addToken(TokenType.LESS, '<', start);
          break;
        default:
          // Alphanumeric tokens (keywords, fields, values)
          if (this.isAlphaNumeric(char)) {
            this.scanIdentifierOrValue();
          } else {
            // Invalid character
            this.advance();
            this.addToken(TokenType.INVALID, char, start);
          }
      }
    }

    // Add EOF token
    this.addToken(TokenType.EOF, '', this.current);
    return this.tokens;
  }

  /**
   * Scans an identifier (keyword/field) or value (string/number/date)
   * 
   * Uses lookahead to classify the token type:
   * - DATE pattern: YYYY-MM-DD
   * - NUMBER pattern: digits only
   * - KEYWORD: AND, OR, NOT, CONTAINS
   * - FIELD: known field names
   * - STRING: everything else
   * 
   * Postcondition: current points to character after identifier/value
   */
  private scanIdentifierOrValue(): void {
    const start = this.current;
    
    // Read alphanumeric sequence
    while (!this.isAtEnd() && (this.isAlphaNumeric(this.peek()) || this.peek() === '-')) {
      this.advance();
    }

    const value = this.input.substring(start, this.current);

    // Classify token by pattern matching
    if (this.isKeyword(value)) {
      this.addToken(this.getKeywordType(value), value, start);
    } else if (this.isDatePattern(value)) {
      this.addToken(TokenType.DATE, value, start);
    } else if (this.isNumberPattern(value)) {
      this.addToken(TokenType.NUMBER, value, start);
    } else if (this.isFieldName(value)) {
      this.addToken(TokenType.FIELD, value, start);
    } else {
      this.addToken(TokenType.STRING, value, start);
    }
  }

  /**
   * Pattern matchers using regular expressions
   * Represents: Regular language recognition
   */
  private isKeyword(value: string): boolean {
    return ['AND', 'OR', 'NOT', 'CONTAINS'].includes(value.toUpperCase());
  }

  private getKeywordType(value: string): TokenType {
    switch (value.toUpperCase()) {
      case 'AND': return TokenType.AND;
      case 'OR': return TokenType.OR;
      case 'NOT': return TokenType.NOT;
      case 'CONTAINS': return TokenType.CONTAINS;
      default: return TokenType.STRING;
    }
  }

  private isDatePattern(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private isNumberPattern(value: string): boolean {
    return /^\d+$/.test(value);
  }

  private isFieldName(value: string): boolean {
    const validFields = ['title', 'status', 'organizer', 'venue', 'date', 'capacity'];
    return validFields.includes(value.toLowerCase());
  }

  private isAlphaNumeric(char: string): boolean {
    return /[a-zA-Z0-9_]/.test(char);
  }

  /**
   * Helper methods for character navigation
   */
  private peek(): string {
    if (this.isAtEnd()) return '\0';
    return this.input[this.current];
  }

  private peekNext(): string {
    if (this.current + 1 >= this.input.length) return '\0';
    return this.input[this.current + 1];
  }

  private advance(): string {
    return this.input[this.current++];
  }

  private isAtEnd(): boolean {
    return this.current >= this.input.length;
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd() && /\s/.test(this.peek())) {
      this.advance();
    }
  }

  private addToken(type: TokenType, value: string, position: number): void {
    this.tokens.push({ type, value, position });
  }

  /**
   * Rep invariant checker (for debugging/testing)
   * 
   * Specification:
   * - Verifies current position is valid
   * - Verifies tokens array is consistent
   * 
   * @returns true if invariant holds
   */
  public checkRep(): boolean {
    if (this.current < 0 || this.current > this.input.length) {
      return false;
    }
    
    if (this.tokens.length > 0) {
      const lastToken = this.tokens[this.tokens.length - 1];
      if (lastToken.type === TokenType.EOF && lastToken.position !== this.input.length) {
        return false;
      }
    }
    
    return true;
  }
}
