// Grammar and type definitions
export { 
  RuleChannel,
  RuleField,
  RuleOperator,
  EventStatus,
  isValidChannel,
  isValidField,
  isValidOperator
} from './grammar';

// Parser (generated from query.peggy grammar)
export { parse, SyntaxError } from './parser-generated';

// AST (abstract syntax tree)
export {
  ASTNode,
  Expression,
  RuleNode,
  BinaryNode,
  ConditionNode,
  createRuleNode,
  createBinaryNode,
  createConditionNode,
  printAST,
  validateAST,
  countNodes,
  getDepth
} from './ast';

// Interpreter (evaluation)
export {
  Interpreter,
  EvaluationContext,
  RuleEvaluationResult
} from './interpreter';

/**
 * Execute a query to filter events
 * 
 * @param query - Query string in our DSL (only the condition part)
 * @param events - Array of events to filter
 * @returns Object with filtered events and count
 * 
 * Example:
 *   executeQuery('status = UPCOMING', events)
 *   executeQuery('hours_until < 24 AND capacity > 100', events)
 */
export function executeQuery(query: string, events: any[]): { events: any[], count: number } {
  // Import the necessary functions and types
  const { parse } = require('./parser-generated');
  const { Interpreter } = require('./interpreter');
  
  // Parse the query by wrapping it in a SEND clause (we only care about the condition)
  const fullQuery = `SEND email WHEN ${query}`;
  const ast = parse(fullQuery);
  
  // Filter events based on the condition
  const filteredEvents = events.filter(event => {
    const result = Interpreter.evaluateRule(ast, event);
    return result.shouldSend;
  });
  
  return {
    events: filteredEvents,
    count: filteredEvents.length
  };
}