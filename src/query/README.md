# Event Query Language - Little Language Implementation

## Overview

This directory contains a complete implementation of a **domain-specific language (DSL)** for querying events in the CampusConnect event management system. This implementation demonstrates key software construction concepts from MIT 6.102, particularly focusing on **grammar design**, **parsing**, and **little languages**.

## Software Construction Concepts Demonstrated

### 1. **Grammar (Formal Language Theory)**

The Event Query Language is defined using **Extended Backus-Naur Form (EBNF)** notation:

```ebnf
Query        ::= Expression EOF
Expression   ::= AndExpr ( 'OR' AndExpr )*
AndExpr      ::= Condition ( 'AND' Condition )*
Condition    ::= Comparison | '(' Expression ')'
Comparison   ::= Field Operator Value

Field        ::= 'title' | 'status' | 'organizer' | 'venue' | 'date' | 'capacity'
Operator     ::= '=' | '!=' | 'CONTAINS' | '>' | '<' | '>=' | '<='
Value        ::= STRING | DATE | NUMBER
```

**Grammar properties:**
- **Context-free grammar** allowing recursive nesting
- **Unambiguous** - each valid query has exactly one parse tree
- **Operator precedence** built into grammar structure (AND > OR)
- **Left-associative** operators for natural evaluation order

### 2. **Parsing (Recursive Descent)**

The parser implements a **recursive descent** algorithm where each grammar production maps to a parsing method:

```
parseExpression()  →  Expression ::= AndExpr ( 'OR' AndExpr )*
parseAndExpr()     →  AndExpr ::= Condition ( 'AND' Condition )*
parseCondition()   →  Condition ::= Comparison | '(' Expression ')'
parseComparison()  →  Comparison ::= Field Operator Value
```

**Parsing characteristics:**
- **Top-down** parsing with **lookahead**
- **Predictive** - decides which production to use based on current token
- **Error recovery** with detailed error messages including position
- **O(n) time complexity** where n is the number of tokens

### 3. **Little Languages (Domain-Specific Languages)**

The Event Query Language is a **little language** - a small, specialized language designed for a specific domain (event querying).

**Benefits of little languages:**
- **Declarative** - express what you want, not how to compute it
- **Domain-focused** - syntax tailored to event queries
- **Safe** - type-checked and validated
- **Composable** - build complex queries from simple parts

**Example queries:**
```sql
status = UPCOMING
status = UPCOMING AND capacity > 50
title CONTAINS workshop OR title CONTAINS seminar
(status = UPCOMING OR status = INPROGRESS) AND venue = auditorium
date > 2025-12-14 AND date < 2025-12-31
```

### 4. **Recursive Data Types**

The Abstract Syntax Tree (AST) uses **recursive data types**:

```typescript
type Expression = BinaryExpr | ComparisonExpr | FieldExpr

interface BinaryExpr {
  kind: 'BinaryExpr';
  operator: 'AND' | 'OR';
  left: Expression;    // Recursive: Expression contains Expression
  right: Expression;   // Recursive: Expression contains Expression
}
```

**Properties of recursive data types:**
- **Self-referential** structure allowing arbitrary nesting
- **Tree-shaped** data (no cycles)
- **Pattern matching** for traversal and evaluation
- **Structural recursion** in operations (countNodes, getDepth, evaluate)

### 5. **Abstract Data Types (ADTs)**

Each component is designed as an **abstract data type** with:

**Representation invariants:**
```typescript
// Lexer invariant: 0 <= current <= input.length
// Parser invariant: tokens array ends with EOF
// AST invariant: tree structure with no cycles
```

**Operations:**
```typescript
// Lexer: tokenize() → Token[]
// Parser: parse() → Expression
// Interpreter: evaluate(Expression) → QueryResult
```

**Specifications (pre/postconditions):**
```typescript
/**
 * @precondition: input !== null
 * @postcondition: returns valid token stream ending with EOF
 */
public tokenize(): Token[]
```

### 6. **Regular Expressions**

The lexer uses **regular expressions** for pattern matching:

```typescript
isDatePattern(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

isNumberPattern(value: string): boolean {
  return /^\d+$/.test(value);
}

isAlphaNumeric(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}
```

**Regular expressions provide:**
- **Declarative** pattern matching
- **Efficient** finite state machine implementation
- **Composable** patterns using alternation, repetition, grouping

### 7. **Specifications and Documentation**

Every method includes detailed specifications:

```typescript
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
 * Precondition: ast is valid AST from parser
 * Postcondition: Result contains events matching query
 * Postcondition: events array unchanged (immutable)
 */
public evaluate(ast: Expression): QueryResult
```

### 8. **Immutability**

All AST nodes are **immutable** using TypeScript's `readonly` modifier:

```typescript
interface BinaryExpr {
  readonly kind: 'BinaryExpr';
  readonly operator: 'AND' | 'OR';
  readonly left: Expression;
  readonly right: Expression;
}
```

**Benefits:**
- **Thread-safe** (no concurrent modification)
- **Easier reasoning** (no hidden mutations)
- **Functional style** (pure functions)

### 9. **Static Type Checking**

TypeScript provides **compile-time type safety**:

```typescript
// Discriminated unions for exhaustive checking
type Expression = BinaryExpr | ComparisonExpr | FieldExpr;

function evaluate(expr: Expression): boolean {
  switch (expr.kind) {
    case 'BinaryExpr': return evalBinary(expr);
    case 'ComparisonExpr': return evalComparison(expr);
    case 'FieldExpr': return evalField(expr);
    default:
      const _exhaustive: never = expr; // Compile error if case missing
      return false;
  }
}
```

### 10. **Testing (Test-First Development)**

Comprehensive test suites with **partition-based testing**:

```typescript
describe('Lexer', () => {
  // Partition on token types
  test('tokenizes AND keyword', () => { /* ... */ });
  test('tokenizes = operator', () => { /* ... */ });
  
  // Boundary cases
  test('handles empty string', () => { /* ... */ });
  test('handles invalid characters', () => { /* ... */ });
  
  // Error cases
  test('marks invalid characters as INVALID', () => { /* ... */ });
});
```

**Test strategies:**
- **Specification testing** - test against documented behavior
- **Glass-box testing** - test internal structure (AST depth, node count)
- **Boundary testing** - empty input, single token, complex nested queries
- **Error testing** - invalid syntax, missing tokens, unclosed parentheses

### 11. **Code as Data**

The query language embodies the **"code as data"** principle:

1. **Text query** (code) → **Lexer** → Tokens (data)
2. **Tokens** (data) → **Parser** → AST (data structure)
3. **AST** (data) → **Interpreter** → Results

The AST is a **first-class data structure** that can be:
- Inspected (`printAST`)
- Validated (`validateAST`)
- Transformed (could add query optimization)
- Serialized (could save/load queries)

## Architecture

```
src/query/
├── grammar.ts       # Grammar definition (EBNF)
├── lexer.ts         # Tokenization (lexical analysis)
├── parser.ts        # Parsing (syntax analysis)
├── ast.ts           # Abstract syntax tree (data types)
├── interpreter.ts   # Evaluation (semantic analysis)
├── index.ts         # Public API
└── __tests__/
    ├── lexer.test.ts     # Lexer tests (100+ tests)
    └── parser.test.ts    # Parser tests (50+ tests)
```

## Usage

### API Endpoint

```http
POST /api/events/query
Content-Type: application/json

{
  "query": "status = UPCOMING AND capacity > 50"
}
```

**Response:**
```json
{
  "events": [...],
  "matched": 5,
  "total": 20,
  "executionTimeMs": 12,
  "query": "status = UPCOMING AND capacity > 50"
}
```

### Programmatic Usage

```typescript
import { executeQuery, parseQuery, printAST } from './query';

// Execute query directly
const result = executeQuery(
  "status = UPCOMING AND capacity > 50",
  allEvents
);
console.log(`Found ${result.matched} events`);

// Or parse and inspect AST
const ast = parseQuery("title CONTAINS workshop");
console.log(printAST(ast));

// Then evaluate
const interpreter = new Interpreter(allEvents);
const result = interpreter.evaluate(ast);
```

### Help Endpoint

```http
GET /api/events/query/help
```

Returns complete documentation with examples and grammar reference.

## Query Examples

### Simple Queries

```sql
-- Find all upcoming events
status = UPCOMING

-- Find events in a specific venue
venue = auditorium

-- Find large capacity events
capacity > 100
```

### Compound Queries

```sql
-- Upcoming events in auditorium
status = UPCOMING AND venue = auditorium

-- Events that are upcoming or in progress
status = UPCOMING OR status = INPROGRESS

-- Large upcoming events
status = UPCOMING AND capacity > 50
```

### Complex Queries

```sql
-- Active events with high capacity
(status = UPCOMING OR status = INPROGRESS) AND capacity > 100

-- Workshops or seminars in specific date range
(title CONTAINS workshop OR title CONTAINS seminar) AND date > 2025-12-14
```

### Text Search

```sql
-- Events with "workshop" in title
title CONTAINS workshop

-- Events organized by specific user
organizer = user123
```

### Date Range Queries

```sql
-- Events in December 2025
date > 2025-12-01 AND date < 2025-12-31

-- Events starting after today
date > 2025-12-14
```

## Implementation Details

### Lexer (Tokenization)

**Regular expression-based tokenizer:**
- Recognizes keywords (AND, OR, CONTAINS)
- Identifies operators (=, !=, >, <, >=, <=)
- Classifies values (STRING, NUMBER, DATE)
- Tracks position for error reporting

### Parser (Syntax Analysis)

**Recursive descent with operator precedence:**
- AND has higher precedence than OR
- Left-associative operators
- Parentheses for grouping
- Predictive parsing with 1-token lookahead

### AST (Intermediate Representation)

**Tree structure with three node types:**
- `BinaryExpr` - AND/OR operations
- `ComparisonExpr` - field operator value
- `FieldExpr` - simple field reference

### Interpreter (Evaluation)

**Visitor pattern for AST traversal:**
- Recursively evaluates expressions
- Short-circuit evaluation (AND, OR)
- Type-aware comparisons (string, number, date)
- Case-insensitive string matching

## Testing

Run tests:
```bash
npm test -- query
```

**Test coverage:**
- Lexer: 100+ test cases covering all token types
- Parser: 50+ test cases covering grammar productions
- Edge cases: empty input, invalid syntax, boundary conditions
- Integration: end-to-end query execution

## Performance

**Time complexity:**
- Lexing: O(n) where n = input length
- Parsing: O(t) where t = number of tokens
- Evaluation: O(e × d) where e = number of events, d = AST depth

**Space complexity:**
- Token array: O(t)
- AST: O(d) where d = AST depth
- Results: O(m) where m = matched events

**Typical performance:**
- Lexing + Parsing: < 5ms for complex queries
- Evaluation: 10-50ms for 1000 events
- Total: < 100ms end-to-end

## Academic Relevance

This implementation is designed to demonstrate MIT 6.102 Software Construction concepts:

1. ✅ **Grammar** - Formal EBNF grammar
2. ✅ **Parsing** - Recursive descent parser
3. ✅ **Little Languages** - Domain-specific query language
4. ✅ **Recursive Data Types** - AST with nested expressions
5. ✅ **Abstract Data Types** - Lexer, Parser, Interpreter
6. ✅ **Regular Expressions** - Pattern matching in lexer
7. ✅ **Specifications** - Pre/postconditions, invariants
8. ✅ **Immutability** - Readonly AST nodes
9. ✅ **Static Checking** - TypeScript type safety
10. ✅ **Testing** - Comprehensive test suites

## Future Enhancements

**Potential extensions:**
1. **Query optimization** - rewrite AST for better performance
2. **Query caching** - memoize parsed queries
3. **More operators** - LIKE, IN, BETWEEN, NOT
4. **Aggregations** - COUNT, SUM, AVG
5. **Sorting** - ORDER BY clause
6. **Pagination** - LIMIT, OFFSET
7. **Subqueries** - nested query support
8. **Query builder UI** - visual query construction

## References

- MIT 6.102 Software Construction Course
- "Crafting Interpreters" by Robert Nystrom
- "Modern Compiler Implementation" by Andrew Appel
- "Programming Language Pragmatics" by Michael Scott

## Authors

Developed as part of the CampusConnect event management system to demonstrate software construction principles with practical application.
