/**
 * Event Query Language Grammar (Peggy)
 * 
 * Formal grammar definition for the domain-specific query language.
 * This grammar-first approach demonstrates the "little languages" concept
 * by making the grammar the primary specification.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS:
 * - Grammar as specification (declarative)
 * - Parser generators (tools over hand-coding)
 * - Separation of syntax from semantics
 * - Recursive grammar rules
 * - Operator precedence through grammar structure
 */

{{
  const { createBinaryExpr, createComparisonExpr } = require('./ast');
}}

// Entry point
Query
  = _ expr:Expression _ EOF { return expr; }

// Expressions with OR (lowest precedence)
Expression
  = left:AndExpr _ "OR"i _ right:Expression {
      return createBinaryExpr('OR', left, right);
    }
  / AndExpr

// AND expressions (higher precedence than OR)
AndExpr
  = left:Condition _ "AND"i _ right:AndExpr {
      return createBinaryExpr('AND', left, right);
    }
  / Condition

// Conditions: grouped or comparison
Condition
  = "(" _ expr:Expression _ ")" { return expr; }
  / Comparison

// Field comparisons
Comparison
  = field:Field _ op:Operator _ value:Value {
      return createComparisonExpr(field, op, value);
    }

// Operators
Operator
  = "CONTAINS"i { return 'CONTAINS'; }
  / ">=" { return '>='; }
  / "<=" { return '<='; }
  / "!=" { return '!='; }
  / "=" { return '='; }
  / ">" { return '>'; }
  / "<" { return '<'; }

// Field names
Field
  = "title"i { return 'title'; }
  / "status"i { return 'status'; }
  / "organizer"i { return 'organizer'; }
  / "venue"i { return 'venue'; }
  / "date"i { return 'date'; }
  / "capacity"i { return 'capacity'; }

// Values
Value
  = DateValue
  / NumberValue
  / StringValue

DateValue
  = value:$([0-9][0-9][0-9][0-9] "-" [0-9][0-9] "-" [0-9][0-9]) {
      return new Date(value);
    }

NumberValue
  = value:$([0-9]+) { return parseInt(value, 10); }

StringValue
  = value:$([a-zA-Z0-9_-]+) { return value; }

// Whitespace and EOF
_ "whitespace"
  = [ \t\r\n]*

EOF
  = !.
