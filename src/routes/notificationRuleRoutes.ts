/**
 * Notification Rules Routes (Admin Only)
 * 
 * CRUD endpoints for managing DSL-based notification rules.
 * Only admins can create, update, or delete rules.
 * 
 * Demonstrates: Little language configuration interface
 */

import { Router, Request, Response } from 'express';
import * as notificationRuleRepository from '../repositories/notificationRuleRepository';
import { parse } from '../query';
import { Interpreter } from '../query/interpreter';
import { RuleNode } from '../query/ast';
import { requireAuth, requireRole } from '../utils/permissionHelpers';

const router = Router();

/**
 * GET /api/notification-rules
 * 
 * Lists all notification rules (admin view)
 */
router.get('/', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    try {
        const rules = await notificationRuleRepository.getAllRules();
        res.json({
            success: true,
            data: rules
        });
    } catch (error: any) {
        console.error('[NotificationRules] Get all rules failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification rules',
            error: error.message
        });
    }
});

/**
 * GET /api/notification-rules/enabled
 * 
 * Lists only enabled rules (used by scheduler)
 */
router.get('/enabled', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    try {
        const rules = await notificationRuleRepository.getEnabledRules();
        res.json({
            success: true,
            data: rules
        });
    } catch (error: any) {
        console.error('[NotificationRules] Get enabled rules failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch enabled rules',
            error: error.message
        });
    }
});

/**
 * GET /api/notification-rules/:id
 * 
 * Gets a single notification rule by ID
 */
router.get('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    try {
        const rule = await notificationRuleRepository.getRuleById(req.params.id);
        
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: 'Notification rule not found'
            });
        }

        res.json({
            success: true,
            data: rule
        });
    } catch (error: any) {
        console.error('[NotificationRules] Get rule failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification rule',
            error: error.message
        });
    }
});

/**
 * POST /api/notification-rules/validate
 * 
 * Validates a DSL rule without saving it
 * Useful for real-time syntax checking in admin UI
 */
router.post('/validate', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const { rule_text } = req.body;

    if (!rule_text) {
        return res.status(400).json({
            success: false,
            message: 'rule_text is required'
        });
    }

    try {
        // Parse DSL rule
        const parseResult = parse(rule_text);
        
        // Check if parse returned an error or a valid AST
        if (!parseResult || typeof parseResult !== 'object') {
            return res.status(400).json({
                success: false,
                valid: false,
                error: 'Invalid rule syntax'
            });
        }
        
        const ast = parseResult as unknown as RuleNode;
        
        // Validate rule structure
        const validation = Interpreter.validateRule(ast);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                valid: false,
                error: validation.error
            });
        }

        res.json({
            success: true,
            valid: true,
            message: 'Rule syntax is valid',
            ast: ast // Return AST for inspection
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            valid: false,
            error: error.message || 'Invalid rule syntax'
        });
    }
});

/**
 * POST /api/notification-rules
 * 
 * Creates a new notification rule
 */
router.post('/', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const { name, description, rule_text, enabled } = req.body;
    const userId = req.user!.id;

    // Validation
    if (!name || !rule_text) {
        return res.status(400).json({
            success: false,
            message: 'name and rule_text are required'
        });
    }

    try {
        // Validate DSL syntax
        const parseResult = parse(rule_text);
        
        if (!parseResult || typeof parseResult !== 'object') {
            return res.status(400).json({
                success: false,
                message: 'Invalid rule syntax'
            });
        }
        
        const ast = parseResult as unknown as RuleNode;
        const validation = Interpreter.validateRule(ast);
        
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid rule syntax',
                error: validation.error
            });
        }

        // Create rule
        const rule = await notificationRuleRepository.createRule({
            name,
            description,
            rule_text,
            created_by: userId,
            enabled: enabled !== false
        });

        res.status(201).json({
            success: true,
            message: 'Notification rule created successfully',
            data: rule
        });
    } catch (error: any) {
        console.error('[NotificationRules] Create rule failed:', error);
        
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({
                success: false,
                message: 'A rule with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create notification rule',
            error: error.message
        });
    }
});

/**
 * PUT /api/notification-rules/:id
 * 
 * Updates an existing notification rule
 */
router.put('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const { name, description, rule_text, enabled } = req.body;
    const ruleId = req.params.id;

    // Check if rule exists
    const existingRule = await notificationRuleRepository.getRuleById(ruleId);
    if (!existingRule) {
        return res.status(404).json({
            success: false,
            message: 'Notification rule not found'
        });
    }

    try {
        // If rule_text is being updated, validate it
        if (rule_text) {
            const parseResult = parse(rule_text);
            
            if (!parseResult || typeof parseResult !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid rule syntax'
                });
            }
            
            const ast = parseResult as unknown as RuleNode;
            const validation = Interpreter.validateRule(ast);
            
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid rule syntax',
                    error: validation.error
                });
            }
        }

        // Update rule
        const updatedRule = await notificationRuleRepository.updateRule(ruleId, {
            name,
            description,
            rule_text,
            enabled
        });

        res.json({
            success: true,
            message: 'Notification rule updated successfully',
            data: updatedRule
        });
    } catch (error: any) {
        console.error('[NotificationRules] Update rule failed:', error);
        
        if (error.message?.includes('UNIQUE')) {
            return res.status(400).json({
                success: false,
                message: 'A rule with this name already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update notification rule',
            error: error.message
        });
    }
});

/**
 * DELETE /api/notification-rules/:id
 * 
 * Deletes a notification rule
 */
router.delete('/:id', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const ruleId = req.params.id;

    try {
        const rule = await notificationRuleRepository.getRuleById(ruleId);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: 'Notification rule not found'
            });
        }

        await notificationRuleRepository.deleteRule(ruleId);

        res.json({
            success: true,
            message: 'Notification rule deleted successfully'
        });
    } catch (error: any) {
        console.error('[NotificationRules] Delete rule failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification rule',
            error: error.message
        });
    }
});

/**
 * PATCH /api/notification-rules/:id/toggle
 * 
 * Enables or disables a notification rule
 */
router.patch('/:id/toggle', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
    const ruleId = req.params.id;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: 'enabled must be a boolean value'
        });
    }

    try {
        const rule = await notificationRuleRepository.getRuleById(ruleId);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: 'Notification rule not found'
            });
        }

        await notificationRuleRepository.setRuleEnabled(ruleId, enabled);

        res.json({
            success: true,
            message: `Notification rule ${enabled ? 'enabled' : 'disabled'} successfully`
        });
    } catch (error: any) {
        console.error('[NotificationRules] Toggle rule failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle notification rule',
            error: error.message
        });
    }
});

export default router;
