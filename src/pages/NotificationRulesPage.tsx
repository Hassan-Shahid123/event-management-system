import React, { useState, useEffect } from 'react';
import { notificationRulesAPI } from '../services/api';
import './NotificationRulesPage.css';

interface NotificationRule {
  id: string;
  name: string;
  description?: string;
  rule_text: string;
  enabled: number;
  created_at: string;
}

const NotificationRulesPage: React.FC = () => {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_text: '',
    enabled: true
  });
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await notificationRulesAPI.getAll();
      setRules(data);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateRule = async (ruleText: string): Promise<boolean> => {
    try {
      const result = await notificationRulesAPI.validate(ruleText);
      if (result.valid) {
        setValidationError('');
        return true;
      } else {
        setValidationError(result.error || 'Invalid rule syntax');
        return false;
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Validation failed')
        : 'Validation failed';
      setValidationError(errorMessage);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateRule(formData.rule_text);
    if (!isValid) return;

    try {
      if (editingRule) {
        await notificationRulesAPI.update(editingRule.id, formData);
      } else {
        await notificationRulesAPI.create(formData);
      }
      
      setShowForm(false);
      setEditingRule(null);
      setFormData({ name: '', description: '', rule_text: '', enabled: true });
      setValidationError('');
      loadRules();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? ((error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to save rule')
        : 'Failed to save rule';
      setValidationError(errorMessage);
    }
  };

  const handleEdit = (rule: NotificationRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_text: rule.rule_text,
      enabled: rule.enabled === 1
    });
    setValidationError('');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    
    try {
      await notificationRulesAPI.delete(id);
      loadRules();
    } catch {
      alert('Failed to delete rule');
    }
  };

  const handleToggle = async (rule: NotificationRule) => {
    try {
      await notificationRulesAPI.toggle(rule.id, rule.enabled === 0);
      loadRules();
    } catch {
      alert('Failed to toggle rule');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData({ name: '', description: '', rule_text: '', enabled: true });
    setValidationError('');
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="notification-rules-page">
      <div className="rules-header">
        <h1>Notification Rules</h1>
        <p className="subtitle">Automate event notifications with custom rules</p>
      </div>

      <div className="rule-actions">
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New Rule
        </button>
      </div>

      {showForm && (
        <div className="rule-form-modal">
          <div className="rule-form-content">
            <h2>{editingRule ? 'Edit Rule' : 'Create New Rule'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Rule Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., 24-Hour Reminder"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="form-group">
                <label>Rule Text *</label>
                <textarea
                  value={formData.rule_text}
                  onChange={(e) => setFormData({ ...formData, rule_text: e.target.value })}
                  required
                  placeholder="SEND EMAIL WHEN hours_until = 24"
                  rows={3}
                />
                <small className="form-hint">
                  Examples: 
                  <br/>• SEND EMAIL WHEN hours_until = 24
                  <br/>• SEND EMAIL WHEN hours_until = 1 AND status = UPCOMING
                  <br/>• SEND EMAIL WHEN days_until = 7 AND capacity &gt; 100
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                  <span>Enabled</span>
                </label>
              </div>

              {validationError && (
                <div className="error-message">{validationError}</div>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="rules-list">
        {rules.length === 0 ? (
          <div className="empty-state">
            <p>No notification rules configured yet.</p>
            <p>Create your first rule to automate event notifications!</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className={`rule-card ${rule.enabled ? 'enabled' : 'disabled'}`}>
              <div className="rule-header">
                <h3>{rule.name}</h3>
                <div className="rule-actions">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled === 1}
                      onChange={() => handleToggle(rule)}
                    />
                    <span className="slider"></span>
                  </label>
                  <button className="btn-edit" onClick={() => handleEdit(rule)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(rule.id)}>Delete</button>
                </div>
              </div>
              
              {rule.description && (
                <p className="rule-description">{rule.description}</p>
              )}
              
              <div className="rule-text">
                <code>{rule.rule_text}</code>
              </div>
              
              <div className="rule-footer">
                <span className={`status-badge ${rule.enabled ? 'active' : 'inactive'}`}>
                  {rule.enabled ? 'Active' : 'Inactive'}
                </span>
                <span className="rule-date">
                  Created: {new Date(rule.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationRulesPage;
