/**
 * Event Query Language - Parser Tests
 * 
 * Tests the parser's ability to construct correct AST from tokens.
 * Demonstrates specification-based testing and grammar validation.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * ==============================
 * - Specification testing (test against documented behavior)
 * - Grammar-based test generation
 * - Recursive structure testing
 * - Error handling testing
 */

import { parseQuery, ParseError } from '../parser';
import { Lexer } from '../lexer';
import { Parser } from '../parser';
import { validateAST, countNodes, getDepth } from '../ast';

describe('Parser', () => {
  /**
   * Test strategy:
   * - Partition on grammar productions
   * - Test each operator (AND, OR, comparisons)
   * - Test precedence and associativity
   * - Test error cases
   * - Test boundary cases (empty, complex)
   */

  describe('Simple comparisons', () => {
    /**
     * Covers: Comparison ::= Field Operator Value
     */
    test('parses equality comparison', () => {
      const ast = parseQuery('status = UPCOMING');
      
      expect(ast.kind).toBe('ComparisonExpr');
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('status');
        expect(ast.operator).toBe('=');
        expect(ast.value).toBe('UPCOMING');
      }
    });

    test('parses inequality comparison', () => {
      const ast = parseQuery('status != CANCELLED');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.operator).toBe('!=');
        expect(ast.value).toBe('CANCELLED');
      }
    });

    test('parses CONTAINS comparison', () => {
      const ast = parseQuery('title CONTAINS workshop');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('title');
        expect(ast.operator).toBe('CONTAINS');
        expect(ast.value).toBe('workshop');
      }
    });

    test('parses numeric comparison', () => {
      const ast = parseQuery('capacity > 50');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('capacity');
        expect(ast.operator).toBe('>');
        expect(ast.value).toBe(50);
      }
    });

    test('parses date comparison', () => {
      const ast = parseQuery('date > 2025-12-14');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('date');
        expect(ast.operator).toBe('>');
        expect(ast.value).toBeInstanceOf(Date);
      }
    });
  });

  describe('Binary expressions', () => {
    /**
     * Covers: Expression ::= AndExpr ( 'OR' AndExpr )*
     */
    test('parses AND expression', () => {
      const ast = parseQuery('status = UPCOMING AND venue = auditorium');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(ast.left.kind).toBe('ComparisonExpr');
        expect(ast.right.kind).toBe('ComparisonExpr');
      }
    });

    test('parses OR expression', () => {
      const ast = parseQuery('status = UPCOMING OR status = INPROGRESS');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
      }
    });

    /**
     * Covers: Left-associativity
     * A AND B AND C should parse as (A AND B) AND C
     */
    test('AND is left-associative', () => {
      const ast = parseQuery('a = 1 AND b = 2 AND c = 3');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(ast.left.kind).toBe('BinaryExpr');
        expect(ast.right.kind).toBe('ComparisonExpr');
        
        // Left child should be (a = 1 AND b = 2)
        if (ast.left.kind === 'BinaryExpr') {
          expect(ast.left.operator).toBe('AND');
        }
      }
    });

    test('OR is left-associative', () => {
      const ast = parseQuery('a = 1 OR b = 2 OR c = 3');
      
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        expect(ast.left.kind).toBe('BinaryExpr');
      }
    });
  });

  describe('Operator precedence', () => {
    /**
     * Covers: AND has higher precedence than OR
     * A OR B AND C should parse as A OR (B AND C)
     */
    test('AND binds tighter than OR', () => {
      const ast = parseQuery('a = 1 OR b = 2 AND c = 3');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        expect(ast.left.kind).toBe('ComparisonExpr');
        expect(ast.right.kind).toBe('BinaryExpr');
        
        // Right child should be (b = 2 AND c = 3)
        if (ast.right.kind === 'BinaryExpr') {
          expect(ast.right.operator).toBe('AND');
        }
      }
    });

    test('multiple ANDs and ORs respect precedence', () => {
      const ast = parseQuery('a = 1 AND b = 2 OR c = 3 AND d = 4');
      
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        // Left: (a = 1 AND b = 2)
        // Right: (c = 3 AND d = 4)
        expect(ast.left.kind).toBe('BinaryExpr');
        expect(ast.right.kind).toBe('BinaryExpr');
      }
    });
  });

  describe('Grouped expressions', () => {
    /**
     * Covers: Condition ::= '(' Expression ')'
     * Parentheses override default precedence
     */
    test('parses grouped expression', () => {
      const ast = parseQuery('(status = UPCOMING)');
      
      expect(ast.kind).toBe('ComparisonExpr');
    });

    test('parentheses override precedence', () => {
      const ast = parseQuery('(a = 1 OR b = 2) AND c = 3');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(ast.left.kind).toBe('BinaryExpr');
        expect(ast.right.kind).toBe('ComparisonExpr');
        
        // Left child should be (a = 1 OR b = 2)
        if (ast.left.kind === 'BinaryExpr') {
          expect(ast.left.operator).toBe('OR');
        }
      }
    });

    test('parses nested parentheses', () => {
      const ast = parseQuery('((a = 1 OR b = 2) AND c = 3)');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
      }
    });
  });

  describe('Complex queries', () => {
    /**
     * Covers: Real-world query patterns
     */
    test('parses complex event query', () => {
      const ast = parseQuery(
        '(status = UPCOMING OR status = INPROGRESS) AND capacity > 50 AND venue = auditorium'
      );
      
      expect(ast.kind).toBe('BinaryExpr');
      expect(validateAST(ast)).toBe(true);
    });

    test('parses date range with text search', () => {
      const ast = parseQuery(
        'date > 2025-12-14 AND date < 2025-12-31 AND title CONTAINS workshop'
      );
      
      expect(validateAST(ast)).toBe(true);
    });

    test('parses deeply nested query', () => {
      const ast = parseQuery(
        '((a = 1 OR b = 2) AND (c = 3 OR d = 4)) OR (e = 5 AND f = 6)'
      );
      
      expect(validateAST(ast)).toBe(true);
      expect(getDepth(ast)).toBeGreaterThan(2);
    });
  });

  describe('AST structure validation', () => {
    /**
     * Covers: validateAST function
     */
    test('validates simple comparison', () => {
      const ast = parseQuery('status = UPCOMING');
      expect(validateAST(ast)).toBe(true);
    });

    test('validates binary expression', () => {
      const ast = parseQuery('status = UPCOMING AND venue = auditorium');
      expect(validateAST(ast)).toBe(true);
    });

    /**
     * Covers: countNodes function
     */
    test('counts nodes correctly', () => {
      const ast = parseQuery('status = UPCOMING');
      expect(countNodes(ast)).toBe(1);
    });

    test('counts nodes in binary expression', () => {
      const ast = parseQuery('status = UPCOMING AND venue = auditorium');
      expect(countNodes(ast)).toBe(3); // 1 BinaryExpr + 2 ComparisonExpr
    });

    /**
     * Covers: getDepth function
     */
    test('calculates depth of simple comparison', () => {
      const ast = parseQuery('status = UPCOMING');
      expect(getDepth(ast)).toBe(1);
    });

    test('calculates depth of binary expression', () => {
      const ast = parseQuery('a = 1 AND b = 2');
      expect(getDepth(ast)).toBe(2);
    });

    test('calculates depth of nested expression', () => {
      const ast = parseQuery('a = 1 AND b = 2 AND c = 3');
      expect(getDepth(ast)).toBe(3);
    });
  });

  describe('Error handling', () => {
    /**
     * Covers: Syntax errors
     */
    test('throws on missing operator', () => {
      expect(() => parseQuery('status UPCOMING')).toThrow(ParseError);
    });

    test('throws on missing value', () => {
      expect(() => parseQuery('status =')).toThrow(ParseError);
    });

    test('throws on unclosed parenthesis', () => {
      expect(() => parseQuery('(status = UPCOMING')).toThrow(ParseError);
    });

    test('throws on unexpected closing parenthesis', () => {
      expect(() => parseQuery('status = UPCOMING)')).toThrow(ParseError);
    });

    test('throws on missing field', () => {
      expect(() => parseQuery('= UPCOMING')).toThrow(ParseError);
    });

    test('throws on incomplete AND expression', () => {
      expect(() => parseQuery('status = UPCOMING AND')).toThrow(ParseError);
    });

    test('throws on incomplete OR expression', () => {
      expect(() => parseQuery('status = UPCOMING OR')).toThrow(ParseError);
    });

    /**
     * Covers: Error message quality
     */
    test('provides helpful error message', () => {
      try {
        parseQuery('status UPCOMING');
        fail('Should have thrown ParseError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ParseError);
        expect(error.message).toContain('operator');
      }
    });

    test('includes position in error', () => {
      try {
        parseQuery('status = UPCOMING)');
        fail('Should have thrown ParseError');
      } catch (error: any) {
        expect(error).toBeInstanceOf(ParseError);
        expect(error.position).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Rep invariant', () => {
    /**
     * Covers: Parser class invariant
     */
    test('maintains rep invariant', () => {
      const lexer = new Lexer('status = UPCOMING');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      
      expect(parser.checkRep()).toBe(true);
      parser.parse();
      expect(parser.checkRep()).toBe(true);
    });
  });

  describe('All operators', () => {
    /**
     * Covers: Complete operator coverage
     */
    test.each([
      ['=', 'equals'],
      ['!=', 'not equals'],
      ['>', 'greater than'],
      ['<', 'less than'],
      ['>=', 'greater or equal'],
      ['<=', 'less or equal'],
      ['CONTAINS', 'contains']
    ])('parses %s operator', (operator, _description) => {
      const ast = parseQuery(`field ${operator} value`);
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.operator).toBe(operator);
      }
    });
  });

  describe('All fields', () => {
    /**
     * Covers: All supported fields
     */
    test.each([
      'title',
      'status',
      'organizer',
      'venue',
      'date',
      'capacity'
    ])('parses %s field', (field) => {
      const ast = parseQuery(`${field} = value`);
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe(field);
      }
    });
  });
});
