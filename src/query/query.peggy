/**
 * Notification Rule Language Grammar (Peggy)
 * 
 * Domain-specific language for configuring automated event notifications.
 * Admins define rules without coding: when to send, which channel, what conditions.
 * 
 * SOFTWARE CONSTRUCTION CONCEPTS (MIT 6.102):
 * - Grammar as specification (declarative design)
 * - Parser generators (Peggy compiles grammar → parser)
 * - Little languages (domain-specific, not general-purpose)
 * - Separation of syntax (this file) from semantics (interpreter.ts)
 * - Operator precedence through grammar structure (AND > OR)
 * 
 * EXAMPLE RULES:
 * SEND email WHEN hours_until = 24
 * SEND sms WHEN hours_until = 1 AND status = UPCOMING
 * SEND email, sms WHEN hours_until = 36 AND capacity > 100
 * SEND push WHEN (hours_until = 24 OR hours_until = 1) AND status != CANCELLED
 */

{{
  const { createRuleNode, createConditionNode, createBinaryNode } = require('./ast');
}}

// Entry point: SEND <channels> WHEN <conditions>
Rule
  = _ "SEND"i _ channels:ChannelList _ "WHEN"i _ condition:Expression _ EOF {
      return createRuleNode(channels, condition);
    }

// Comma-separated channels: email, sms, push
ChannelList
  = first:Channel rest:(_ "," _ Channel)* {
      return [first, ...rest.map(r => r[3])];
    }

Channel
  = "email"i { return 'email'; }
  / "sms"i { return 'sms'; }
  / "push"i { return 'push'; }

// Boolean expressions with OR (lowest precedence)
Expression
  = left:AndExpr _ "OR"i _ right:Expression {
      return createBinaryNode('OR', left, right);
    }
  / AndExpr

// AND expressions (higher precedence than OR)
AndExpr
  = left:Condition _ "AND"i _ right:AndExpr {
      return createBinaryNode('AND', left, right);
    }
  / Condition

// Conditions: grouped or comparison
Condition
  = "(" _ expr:Expression _ ")" { return expr; }
  / Comparison

// Field comparisons
Comparison
  = field:Field _ op:Operator _ value:Value {
      return createConditionNode(field, op, value);
    }

// Operators
Operator
  = ">=" { return '>='; }
  / "<=" { return '<='; }
  / "!=" { return '!='; }
  / "=" { return '='; }
  / ">" { return '>'; }
  / "<" { return '<'; }

// Field names (event properties and computed fields)
Field
  = "hours_until"i { return 'hours_until'; }
  / "minutes_until"i { return 'minutes_until'; }
  / "days_until"i { return 'days_until'; }
  / "status"i { return 'status'; }
  / "capacity"i { return 'capacity'; }
  / "available_seats"i { return 'available_seats'; }
  / "price"i { return 'price'; }
  / "title"i { return 'title'; }

// Values
Value
  = NumberValue
  / StatusValue
  / StringValue

NumberValue
  = value:$([0-9]+) { return parseInt(value, 10); }

StatusValue
  = "UPCOMING"i { return 'UPCOMING'; }
  / "CANCELLED"i { return 'CANCELLED'; }
  / "INPROGRESS"i { return 'INPROGRESS'; }
  / "COMPLETED"i { return 'COMPLETED'; }

StringValue
  = value:$([a-zA-Z0-9_-]+) { return value; }

// Whitespace and EOF
_ "whitespace"
  = [ \t\r\n]*

EOF
  = !.
