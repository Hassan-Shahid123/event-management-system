/**
 * Event Query Language - Lexer Tests
 * 
 * Demonstrates test-driven development and specification testing.
 * Tests the lexer's ability to tokenize query strings correctly.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Unit testing
 * - Test partitioning (equivalence classes)
 * - Boundary testing
 * - Error testing
 * - Test coverage
 */

import { Lexer, TokenType } from '../lexer';

describe('Lexer', () => {
  /**
   * Test strategy:
   * - Partition on token types
   * - Test single tokens
   * - Test token combinations
   * - Test whitespace handling
   * - Test invalid input
   */

  describe('Single token tokenization', () => {
    /**
     * Covers: Logical operators
     */
    test('tokenizes AND keyword', () => {
      const lexer = new Lexer('AND');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(2); // AND + EOF
      expect(tokens[0].type).toBe(TokenType.AND);
      expect(tokens[0].value).toBe('AND');
      expect(tokens[1].type).toBe(TokenType.EOF);
    });

    test('tokenizes OR keyword', () => {
      const lexer = new Lexer('OR');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.OR);
      expect(tokens[0].value).toBe('OR');
    });

    /**
     * Covers: Comparison operators
     */
    test('tokenizes = operator', () => {
      const lexer = new Lexer('=');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.EQUALS);
      expect(tokens[0].value).toBe('=');
    });

    test('tokenizes != operator', () => {
      const lexer = new Lexer('!=');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.NOT_EQUALS);
      expect(tokens[0].value).toBe('!=');
    });

    test('tokenizes > operator', () => {
      const lexer = new Lexer('>');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.GREATER);
      expect(tokens[0].value).toBe('>');
    });

    test('tokenizes >= operator', () => {
      const lexer = new Lexer('>=');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.GREATER_EQ);
      expect(tokens[0].value).toBe('>=');
    });

    test('tokenizes < operator', () => {
      const lexer = new Lexer('<');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.LESS);
      expect(tokens[0].value).toBe('<');
    });

    test('tokenizes <= operator', () => {
      const lexer = new Lexer('<=');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.LESS_EQ);
      expect(tokens[0].value).toBe('<=');
    });

    test('tokenizes CONTAINS keyword', () => {
      const lexer = new Lexer('CONTAINS');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.CONTAINS);
      expect(tokens[0].value).toBe('CONTAINS');
    });

    /**
     * Covers: Grouping
     */
    test('tokenizes ( and )', () => {
      const lexer = new Lexer('()');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(3); // ( + ) + EOF
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[1].type).toBe(TokenType.RPAREN);
    });

    /**
     * Covers: Field names
     */
    test('tokenizes field name', () => {
      const lexer = new Lexer('status');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.FIELD);
      expect(tokens[0].value).toBe('status');
    });

    /**
     * Covers: String values
     */
    test('tokenizes string value', () => {
      const lexer = new Lexer('UPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('UPCOMING');
    });

    /**
     * Covers: Number values
     */
    test('tokenizes number value', () => {
      const lexer = new Lexer('123');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe('123');
    });

    /**
     * Covers: Date values
     * Boundary: Valid date format YYYY-MM-DD
     */
    test('tokenizes date value', () => {
      const lexer = new Lexer('2025-12-14');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.DATE);
      expect(tokens[0].value).toBe('2025-12-14');
    });
  });

  describe('Complex query tokenization', () => {
    /**
     * Covers: Multiple tokens with whitespace
     */
    test('tokenizes simple comparison', () => {
      const lexer = new Lexer('status = UPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(4); // status + = + UPCOMING + EOF
      expect(tokens[0].type).toBe(TokenType.FIELD);
      expect(tokens[0].value).toBe('status');
      expect(tokens[1].type).toBe(TokenType.EQUALS);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe('UPCOMING');
      expect(tokens[3].type).toBe(TokenType.EOF);
    });

    /**
     * Covers: AND expression
     */
    test('tokenizes AND expression', () => {
      const lexer = new Lexer('status = UPCOMING AND venue = auditorium');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].value).toBe('status');
      expect(tokens[1].value).toBe('=');
      expect(tokens[2].value).toBe('UPCOMING');
      expect(tokens[3].type).toBe(TokenType.AND);
      expect(tokens[4].value).toBe('venue');
      expect(tokens[5].value).toBe('=');
      expect(tokens[6].value).toBe('auditorium');
    });

    /**
     * Covers: OR expression
     */
    test('tokenizes OR expression', () => {
      const lexer = new Lexer('status = UPCOMING OR status = INPROGRESS');
      const tokens = lexer.tokenize();
      
      expect(tokens[3].type).toBe(TokenType.OR);
    });

    /**
     * Covers: Grouped expression with parentheses
     */
    test('tokenizes grouped expression', () => {
      const lexer = new Lexer('(status = UPCOMING OR status = INPROGRESS) AND capacity > 50');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.LPAREN);
      expect(tokens[7].type).toBe(TokenType.RPAREN);
      expect(tokens[8].type).toBe(TokenType.AND);
    });

    /**
     * Covers: Numeric comparison
     */
    test('tokenizes numeric comparison', () => {
      const lexer = new Lexer('capacity > 100');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.FIELD);
      expect(tokens[1].type).toBe(TokenType.GREATER);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe('100');
    });

    /**
     * Covers: Date comparison
     */
    test('tokenizes date range query', () => {
      const lexer = new Lexer('date > 2025-12-14 AND date < 2025-12-31');
      const tokens = lexer.tokenize();
      
      expect(tokens[2].type).toBe(TokenType.DATE);
      expect(tokens[2].value).toBe('2025-12-14');
      expect(tokens[6].type).toBe(TokenType.DATE);
      expect(tokens[6].value).toBe('2025-12-31');
    });

    /**
     * Covers: CONTAINS operator
     */
    test('tokenizes CONTAINS expression', () => {
      const lexer = new Lexer('title CONTAINS workshop');
      const tokens = lexer.tokenize();
      
      expect(tokens[1].type).toBe(TokenType.CONTAINS);
      expect(tokens[1].value).toBe('CONTAINS');
    });
  });

  describe('Whitespace handling', () => {
    /**
     * Covers: Leading/trailing whitespace
     */
    test('ignores leading and trailing whitespace', () => {
      const lexer = new Lexer('  status = UPCOMING  ');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(TokenType.FIELD);
    });

    /**
     * Covers: Multiple spaces between tokens
     */
    test('handles multiple spaces', () => {
      const lexer = new Lexer('status    =    UPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(4);
    });

    /**
     * Covers: Tabs and newlines
     */
    test('handles tabs and newlines', () => {
      const lexer = new Lexer('status\t=\nUPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(4);
    });
  });

  describe('Case sensitivity', () => {
    /**
     * Covers: Case-insensitive keywords
     */
    test('recognizes lowercase keywords', () => {
      const lexer = new Lexer('and or contains');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.AND);
      expect(tokens[1].type).toBe(TokenType.OR);
      expect(tokens[2].type).toBe(TokenType.CONTAINS);
    });

    test('recognizes mixed case keywords', () => {
      const lexer = new Lexer('AnD oR CoNtAiNs');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.AND);
      expect(tokens[1].type).toBe(TokenType.OR);
      expect(tokens[2].type).toBe(TokenType.CONTAINS);
    });
  });

  describe('Error handling', () => {
    /**
     * Covers: Empty input
     * Boundary: Minimum input length
     */
    test('handles empty string', () => {
      const lexer = new Lexer('');
      const tokens = lexer.tokenize();
      
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.EOF);
    });

    /**
     * Covers: Invalid characters
     */
    test('marks invalid characters as INVALID', () => {
      const lexer = new Lexer('status @ UPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens[1].type).toBe(TokenType.INVALID);
      expect(tokens[1].value).toBe('@');
    });
  });

  describe('Position tracking', () => {
    /**
     * Covers: Position information for error reporting
     */
    test('tracks token positions', () => {
      const lexer = new Lexer('status = UPCOMING');
      const tokens = lexer.tokenize();
      
      expect(tokens[0].position).toBe(0);  // 'status' starts at 0
      expect(tokens[1].position).toBe(7);  // '=' starts at 7
      expect(tokens[2].position).toBe(9);  // 'UPCOMING' starts at 9
    });
  });

  describe('Rep invariant', () => {
    /**
     * Covers: Class invariant checking
     */
    test('maintains rep invariant after tokenization', () => {
      const lexer = new Lexer('status = UPCOMING');
      lexer.tokenize();
      
      expect(lexer.checkRep()).toBe(true);
    });
  });
});
