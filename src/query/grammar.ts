/**
 * Notification Rule Language - Grammar Definition
 * 
 * This file defines the formal grammar for our domain-specific language (DSL)
 * used to configure automated event notifications in the Event Management System.
 * 
 * GRAMMAR (EBNF Notation):
 * ========================
 * 
 * Rule         ::= 'SEND' 'EMAIL' 'WHEN' Expression
 * Expression   ::= AndExpr ( 'OR' AndExpr )*
 * AndExpr      ::= Condition ( 'AND' Condition )*
 * Condition    ::= Comparison | '(' Expression ')'
 * Comparison   ::= Field Operator Value
 * 
 * Field        ::= 'hours_until' | 'minutes_until' | 'days_until' | 
 *                  'status' | 'capacity' | 'available_seats' | 'price' | 'title'
 * Operator     ::= '=' | '!=' | '>' | '<' | '>=' | '<='
 * Value        ::= NUMBER | STATUS | STRING
 * 
 * STATUS       ::= 'UPCOMING' | 'CANCELLED' | 'INPROGRESS' | 'COMPLETED'
 * NUMBER       ::= [0-9]+
 * STRING       ::= [a-zA-Z0-9_-]+
 */

// Type definitions for grammar elements

export type RuleChannel = 'email' | 'sms' | 'push';

export type RuleField = 
  | 'hours_until'
  | 'minutes_until'
  | 'days_until'
  | 'status'
  | 'capacity'
  | 'available_seats'
  | 'price'
  | 'title';

export type RuleOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

export type EventStatus = 'UPCOMING' | 'CANCELLED' | 'INPROGRESS' | 'COMPLETED';

/**
 * Validates if a string is a valid channel
 */
export function isValidChannel(channel: string): channel is RuleChannel {
  return ['email', 'sms', 'push'].includes(channel);
}

/**
 * Validates if a string is a valid field
 */
export function isValidField(field: string): field is RuleField {
  return [
    'hours_until',
    'minutes_until',
    'days_until',
    'status',
    'capacity',
    'available_seats',
    'price',
    'title'
  ].includes(field);
}

/**
 * Validates if a string is a valid operator
 */
export function isValidOperator(operator: string): operator is RuleOperator {
  return ['=', '!=', '>', '<', '>=', '<='].includes(operator);
}


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
