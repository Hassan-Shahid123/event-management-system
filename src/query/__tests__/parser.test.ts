/**
 * Event Query Language - Parser Tests
 * 
 * Tests Peggy-generated parser's ability to construct correct AST.
 * Demonstrates grammar-based testing and validation.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * - Grammar-driven testing
 * - Specification testing
 * - Recursive structure testing
 * - Error handling
 */

import { parse } from '../parser-generated';
import { validateAST, countNodes, getDepth } from '../ast';

describe('Peggy Parser', () => {
  /**
   * Test strategy:
   * - Test grammar productions
   * - Test operator precedence (AND > OR)
   * - Test associativity
   * - Test error cases
   * - Test AST structure
   */

  describe('Simple comparisons', () => {
    test('parses equality comparison', () => {
      const ast = parse('status = UPCOMING');
      
      expect(ast.kind).toBe('ComparisonExpr');
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('status');
        expect(ast.operator).toBe('=');
        expect(ast.value).toBe('UPCOMING');
      }
    });

    test('parses inequality comparison', () => {
      const ast = parse('status != CANCELLED');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.operator).toBe('!=');
        expect(ast.value).toBe('CANCELLED');
      }
    });

    test('parses CONTAINS comparison', () => {
      const ast = parse('title CONTAINS workshop');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('title');
        expect(ast.operator).toBe('CONTAINS');
        expect(ast.value).toBe('workshop');
      }
    });

    test('parses numeric comparison', () => {
      const ast = parse('capacity > 50');
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe('capacity');
        expect(ast.operator).toBe('>');
        expect(ast.value).toBe(50);
      }
    });

    test('parses date comparison', () => {
      const ast = parse('date > 2025-12-14');
      
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
      const ast = parse('status = UPCOMING AND venue = auditorium');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(ast.left.kind).toBe('ComparisonExpr');
        expect(ast.right.kind).toBe('ComparisonExpr');
      }
    });

    test('parses OR expression', () => {
      const ast = parse('status = UPCOMING OR status = INPROGRESS');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
      }
    });

    test('parses multiple ANDs', () => {
      const ast = parse('status = UPCOMING AND venue = lab AND capacity = 50');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(countNodes(ast)).toBe(5); // 3 comparisons + 2 AND nodes
      }
    });

    test('parses multiple ORs', () => {
      const ast = parse('status = UPCOMING OR status = INPROGRESS OR status = COMPLETED');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        expect(countNodes(ast)).toBe(5); // 3 comparisons + 2 OR nodes
      }
    });
  });

  describe('Operator precedence', () => {
    /**
     * Covers: AND has higher precedence than OR
     * A OR B AND C should parse as A OR (B AND C)
     */
    test('AND binds tighter than OR', () => {
      const ast = parse('status = UPCOMING OR venue = lab AND capacity = 50');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        expect(ast.left.kind).toBe('ComparisonExpr');
        expect(ast.right.kind).toBe('BinaryExpr');
        
        // Right child should be (venue = lab AND capacity = 50)
        if (ast.right.kind === 'BinaryExpr') {
          expect(ast.right.operator).toBe('AND');
        }
      }
    });

    test('multiple ANDs and ORs respect precedence', () => {
      const ast = parse('status = UPCOMING AND venue = lab OR status = INPROGRESS AND capacity = 100');
      
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('OR');
        // Left: (status = UPCOMING AND venue = lab)
        // Right: (status = INPROGRESS AND capacity = 100)
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
      const ast = parse('(status = UPCOMING)');
      
      expect(ast.kind).toBe('ComparisonExpr');
    });

    test('parentheses override precedence', () => {
      const ast = parse('(status = UPCOMING OR status = INPROGRESS) AND venue = lab');
      
      expect(ast.kind).toBe('BinaryExpr');
      if (ast.kind === 'BinaryExpr') {
        expect(ast.operator).toBe('AND');
        expect(ast.left.kind).toBe('BinaryExpr');
        expect(ast.right.kind).toBe('ComparisonExpr');
        
        // Left child should be (status = UPCOMING OR status = INPROGRESS)
        if (ast.left.kind === 'BinaryExpr') {
          expect(ast.left.operator).toBe('OR');
        }
      }
    });

    test('parses nested parentheses', () => {
      const ast = parse('((status = UPCOMING OR status = INPROGRESS) AND venue = lab)');
      
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
      const ast = parse(
        '(status = UPCOMING OR status = INPROGRESS) AND capacity > 50 AND venue = auditorium'
      );
      
      expect(ast.kind).toBe('BinaryExpr');
      expect(validateAST(ast)).toBe(true);
    });

    test('parses date range with text search', () => {
      const ast = parse(
        'date > 2025-12-14 AND date < 2025-12-31 AND title CONTAINS workshop'
      );
      
      expect(validateAST(ast)).toBe(true);
    });

    test('parses deeply nested query', () => {
      const ast = parse(
        '((status = UPCOMING OR status = INPROGRESS) AND (venue = lab OR venue = auditorium)) OR (capacity = 50 AND organizer = user1)'
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
      const ast = parse('status = UPCOMING');
      expect(validateAST(ast)).toBe(true);
    });

    test('validates binary expression', () => {
      const ast = parse('status = UPCOMING AND venue = auditorium');
      expect(validateAST(ast)).toBe(true);
    });

    /**
     * Covers: countNodes function
     */
    test('counts nodes correctly', () => {
      const ast = parse('status = UPCOMING');
      expect(countNodes(ast)).toBe(1);
    });

    test('counts nodes in binary expression', () => {
      const ast = parse('status = UPCOMING AND venue = auditorium');
      expect(countNodes(ast)).toBe(3); // 1 BinaryExpr + 2 ComparisonExpr
    });

    /**
     * Covers: getDepth function
     */
    test('calculates depth of simple comparison', () => {
      const ast = parse('status = UPCOMING');
      expect(getDepth(ast)).toBe(1);
    });

    test('calculates depth of binary expression', () => {
      const ast = parse('status = UPCOMING AND venue = lab');
      expect(getDepth(ast)).toBe(2);
    });

    test('calculates depth of nested expression', () => {
      const ast = parse('status = UPCOMING AND venue = lab AND capacity = 50');
      expect(getDepth(ast)).toBe(3);
    });
  });

  describe('Error handling', () => {
    /**
     * Covers: Syntax errors
     */
    test('throws on missing operator', () => {
      expect(() => parse('status UPCOMING')).toThrow(Error);
    });

    test('throws on missing value', () => {
      expect(() => parse('status =')).toThrow(Error);
    });

    test('throws on unclosed parenthesis', () => {
      expect(() => parse('(status = UPCOMING')).toThrow(Error);
    });

    test('throws on unexpected closing parenthesis', () => {
      expect(() => parse('status = UPCOMING)')).toThrow(Error);
    });

    test('throws on missing field', () => {
      expect(() => parse('= UPCOMING')).toThrow(Error);
    });

    test('throws on incomplete AND expression', () => {
      expect(() => parse('status = UPCOMING AND')).toThrow(Error);
    });

    test('throws on incomplete OR expression', () => {
      expect(() => parse('status = UPCOMING OR')).toThrow(Error);
    });

    /**
     * Covers: Error message quality
     */
    test('provides helpful error message', () => {
      try {
        parse('status UPCOMING');
        fail('Should have thrown Error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
      }
    });

    test('includes location in error', () => {
      try {
        parse('status = UPCOMING)');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error).toBeInstanceOf(Error);
        expect(error.location).toBeDefined();
      }
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
      const ast = parse(`status ${operator} UPCOMING`);
      
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
      const ast = parse(`${field} = value`);
      
      if (ast.kind === 'ComparisonExpr') {
        expect(ast.field).toBe(field);
      }
    });
  });
});


