'use client';
import { useState, useEffect } from 'react';

type ApprovalRule = {
  id: string;
  name: string;
  criteria: {
    minValue?: number;
    maxValue?: number;
    categories?: string[];
    responseVisibility?: string[];
  };
  approvers: {
    role: string;
    userId?: string;
    email: string;
    order: number;
    isParallel: boolean;
  }[];
  slaHours: number;
  escalationEmail: string;
  autoPublish: boolean;
  active: boolean;
};

type ModificationRule = {
  id: string;
  fieldName: string;
  requiresApproval: boolean;
  notifySuppliers: boolean;
};

type PauseReason = {
  id: string;
  reason: string;
  active: boolean;
};

const AdminWorkflowControl = () => {
  const [activeTab, setActiveTab] = useState<'approval' | 'award' | 'modification' | 'pause' | 'config'>('approval');
  
  // Approval Rules State
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ApprovalRule | null>(null);

  // Modification Rules State
  const [modificationRules, setModificationRules] = useState<ModificationRule[]>([
    { id: '1', fieldName: 'Close Date', requiresApproval: true, notifySuppliers: true },
    { id: '2', fieldName: 'Line Items', requiresApproval: true, notifySuppliers: true },
    { id: '3', fieldName: 'Target Price', requiresApproval: true, notifySuppliers: true },
    { id: '4', fieldName: 'Response Visibility', requiresApproval: true, notifySuppliers: false },
    { id: '5', fieldName: 'Note to Supplier', requiresApproval: false, notifySuppliers: true },
  ]);

  // Pause Reasons State
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([
    { id: '1', reason: 'Technical Issue', active: true },
    { id: '2', reason: 'Supplier Query Under Review', active: true },
    { id: '3', reason: 'Internal Clarification Required', active: true },
    { id: '4', reason: 'Awaiting Management Decision', active: true },
    { id: '5', reason: 'Budget Review', active: true },
  ]);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [newPauseReason, setNewPauseReason] = useState('');

  // Configuration State
  const [globalConfig, setGlobalConfig] = useState({
    defaultLineType: 'Goods',
    requirePauseApproval: false,
    enableAutoPublish: true,
    defaultSLAHours: 24,
    defaultCarriers: ['DHL', 'DSV', 'FedEx', 'UPS', 'USPS'],
  });

  const [newCarrier, setNewCarrier] = useState('');

  // Load data
  useEffect(() => {
    loadApprovalRules();
  }, []);

  const loadApprovalRules = async () => {
    try {
      // Replace with actual API call
      // const res = await fetch('/api/admin/approval-rules');
      // const data = await res.json();
      // setApprovalRules(data);
      
      // Mock data
      setApprovalRules([
        {
          id: '1',
          name: 'High Value RFQ Approval',
          criteria: {
            minValue: 100000,
            responseVisibility: ['unsealed']
          },
          approvers: [
            { role: 'Procurement Head', email: 'procurement@company.com', order: 1, isParallel: false },
            { role: 'Finance Head', email: 'finance@company.com', order: 2, isParallel: false }
          ],
          slaHours: 48,
          escalationEmail: 'escalation@company.com',
          autoPublish: true,
          active: true
        },
        {
          id: '2',
          name: 'Category Specific Approval',
          criteria: {
            categories: ['IT Equipment', 'Consultancy Services']
          },
          approvers: [
            { role: 'Category Lead', email: 'category@company.com', order: 1, isParallel: false }
          ],
          slaHours: 24,
          escalationEmail: 'escalation@company.com',
          autoPublish: false,
          active: true
        }
      ]);
    } catch (error) {
      console.error('Error loading approval rules:', error);
    }
  };

  const saveApprovalRule = async (rule: ApprovalRule) => {
    try {
      // Replace with actual API call
      // await fetch('/api/admin/approval-rules', {
      //   method: 'POST',
      //   body: JSON.stringify(rule)
      // });
      
      if (editingRule) {
        setApprovalRules(prev => prev.map(r => r.id === rule.id ? rule : r));
      } else {
        setApprovalRules(prev => [...prev, { ...rule, id: Date.now().toString() }]);
      }
      
      setShowApprovalModal(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Error saving approval rule:', error);
    }
  };

  const toggleRuleStatus = (id: string) => {
    setApprovalRules(prev => 
      prev.map(rule => 
        rule.id === id ? { ...rule, active: !rule.active } : rule
      )
    );
  };

  const deleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setApprovalRules(prev => prev.filter(r => r.id !== id));
    }
  };

  const updateModificationRule = (id: string, field: 'requiresApproval' | 'notifySuppliers', value: boolean) => {
    setModificationRules(prev =>
      prev.map(rule =>
        rule.id === id ? { ...rule, [field]: value } : rule
      )
    );
  };

  const addPauseReason = () => {
    if (!newPauseReason.trim()) return;
    setPauseReasons(prev => [
      ...prev,
      { id: Date.now().toString(), reason: newPauseReason, active: true }
    ]);
    setNewPauseReason('');
    setShowPauseModal(false);
  };

  const togglePauseReason = (id: string) => {
    setPauseReasons(prev =>
      prev.map(reason =>
        reason.id === id ? { ...reason, active: !reason.active } : reason
      )
    );
  };

  const deletePauseReason = (id: string) => {
    if (confirm('Are you sure you want to delete this pause reason?')) {
      setPauseReasons(prev => prev.filter(r => r.id !== id));
    }
  };

  const addCarrier = () => {
    if (!newCarrier.trim() || globalConfig.defaultCarriers.includes(newCarrier)) return;
    setGlobalConfig(prev => ({
      ...prev,
      defaultCarriers: [...prev.defaultCarriers, newCarrier]
    }));
    setNewCarrier('');
  };

  const removeCarrier = (carrier: string) => {
    setGlobalConfig(prev => ({
      ...prev,
      defaultCarriers: prev.defaultCarriers.filter(c => c !== carrier)
    }));
  };

  const saveGlobalConfig = async () => {
    try {
      // Replace with actual API call
      // await fetch('/api/admin/config', {
      //   method: 'POST',
      //   body: JSON.stringify(globalConfig)
      // });
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">RFQ Workflow Administration</h1>
          <p className="text-sm text-gray-600 mt-1">Configure approval workflows, modification rules, and system settings</p>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-0">
            {[
              { key: 'approval', label: 'Event Approval' },
              { key: 'award', label: 'Award Approval' },
              { key: 'modification', label: 'Modification Rules' },
              { key: 'pause', label: 'Pause Reasons' },
              { key: 'config', label: 'Global Config' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* APPROVAL RULES TAB */}
          {activeTab === 'approval' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Event Creation Approval Rules</h2>
                <button
                  onClick={() => {
                    setEditingRule(null);
                    setShowApprovalModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add New Rule
                </button>
              </div>

              <div className="space-y-3">
                {approvalRules.map(rule => (
                  <div key={rule.id} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{rule.name}</h3>
                          <span className={`px-2 py-1 text-xs rounded ${
                            rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Criteria:</span>
                            <ul className="ml-4 mt-1 text-gray-600">
                              {rule.criteria.minValue && <li>• Min Value: ${rule.criteria.minValue.toLocaleString()}</li>}
                              {rule.criteria.maxValue && <li>• Max Value: ${rule.criteria.maxValue.toLocaleString()}</li>}
                              {rule.criteria.categories && <li>• Categories: {rule.criteria.categories.join(', ')}</li>}
                              {rule.criteria.responseVisibility && <li>• Visibility: {rule.criteria.responseVisibility.join(', ')}</li>}
                            </ul>
                          </div>
                          
                          <div>
                            <span className="font-medium text-gray-700">Approvers:</span>
                            <ul className="ml-4 mt-1 text-gray-600">
                              {rule.approvers.map((approver, idx) => (
                                <li key={idx}>• {approver.role} ({approver.email})</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-4 text-sm text-gray-600">
                          <span>SLA: {rule.slaHours}h</span>
                          <span>Escalation: {rule.escalationEmail}</span>
                          <span>Auto-Publish: {rule.autoPublish ? 'Yes' : 'No'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setShowApprovalModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleRuleStatus(rule.id)}
                          className={`px-3 py-1 text-sm rounded ${
                            rule.active
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {rule.active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteRule(rule.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AWARD APPROVAL TAB */}
          {activeTab === 'award' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Award Approval Configuration</h2>
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <p className="text-sm text-blue-800">
                  Award approval rules follow a similar structure to event approval rules but are triggered when a buyer recommends a supplier for award.
                  Configure value thresholds, split award requirements, and approval hierarchies here.
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                + Add Award Rule
              </button>
            </div>
          )}

          {/* MODIFICATION RULES TAB */}
          {activeTab === 'modification' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Event Modification Rules</h2>
              <p className="text-sm text-gray-600">
                Define which field changes require re-approval and whether suppliers should be notified.
              </p>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Field Name</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Requires Approval</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Notify Suppliers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {modificationRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{rule.fieldName}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={rule.requiresApproval}
                            onChange={(e) => updateModificationRule(rule.id, 'requiresApproval', e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={rule.notifySuppliers}
                            onChange={(e) => updateModificationRule(rule.id, 'notifySuppliers', e.target.checked)}
                            className="w-4 h-4"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => alert('Modification rules saved!')}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save Configuration
              </button>
            </div>
          )}

          {/* PAUSE REASONS TAB */}
          {activeTab === 'pause' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Pause Event Reasons</h2>
                <button
                  onClick={() => setShowPauseModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Reason
                </button>
              </div>

              <div className="space-y-2">
                {pauseReasons.map(reason => (
                  <div key={reason.id} className="flex justify-between items-center p-3 border rounded bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs rounded ${
                        reason.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {reason.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="font-medium">{reason.reason}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => togglePauseReason(reason.id)}
                        className={`px-3 py-1 text-sm rounded ${
                          reason.active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {reason.active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deletePauseReason(reason.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={globalConfig.requirePauseApproval}
                    onChange={(e) => setGlobalConfig(prev => ({ ...prev, requirePauseApproval: e.target.checked }))}
                    className="mt-1"
                  />
                  <div>
                    <label className="font-medium text-sm text-gray-800">Require approval for pause/resume actions</label>
                    <p className="text-xs text-gray-600 mt-1">
                      When enabled, pause and resume actions will require approval from designated personnel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GLOBAL CONFIG TAB */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Global Configuration</h2>

              <div className="space-y-4">
                {/* Default Line Type */}
                <div className="border rounded-lg p-4">
                  <label className="block font-medium text-gray-700 mb-2">Default Line Type</label>
                  <select
                    value={globalConfig.defaultLineType}
                    onChange={(e) => setGlobalConfig(prev => ({ ...prev, defaultLineType: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Goods">Goods</option>
                    <option value="Services">Services</option>
                    <option value="Consultancy">Consultancy</option>
                    <option value="Works">Works</option>
                    <option value="Lump-sum">Lump-sum</option>
                    <option value="Rate Based">Rate Based</option>
                  </select>
                </div>

                {/* Auto Publish */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={globalConfig.enableAutoPublish}
                      onChange={(e) => setGlobalConfig(prev => ({ ...prev, enableAutoPublish: e.target.checked }))}
                      className="mt-1"
                    />
                    <div>
                      <label className="font-medium text-gray-700">Enable Auto-Publish</label>
                      <p className="text-sm text-gray-600 mt-1">
                        Automatically publish RFQs when they are approved and the open date/time is reached.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Default SLA */}
                <div className="border rounded-lg p-4">
                  <label className="block font-medium text-gray-700 mb-2">Default SLA Hours</label>
                  <input
                    type="number"
                    value={globalConfig.defaultSLAHours}
                    onChange={(e) => setGlobalConfig(prev => ({ ...prev, defaultSLAHours: Number(e.target.value) }))}
                    className="w-full border rounded px-3 py-2"
                    min="1"
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Default timeframe for approval actions before escalation.
                  </p>
                </div>

                {/* Carriers */}
                <div className="border rounded-lg p-4">
                  <label className="block font-medium text-gray-700 mb-2">Default Carriers</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newCarrier}
                      onChange={(e) => setNewCarrier(e.target.value)}
                      placeholder="Enter carrier name"
                      className="flex-1 border rounded px-3 py-2"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCarrier())}
                    />
                    <button
                      onClick={addCarrier}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {globalConfig.defaultCarriers.map(carrier => (
                      <span
                        key={carrier}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        {carrier}
                        <button
                          onClick={() => removeCarrier(carrier)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={saveGlobalConfig}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save Configuration
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pause Reason Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Pause Reason</h3>
            <input
              type="text"
              value={newPauseReason}
              onChange={(e) => setNewPauseReason(e.target.value)}
              placeholder="Enter pause reason"
              className="w-full border rounded px-3 py-2 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && addPauseReason()}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={addPauseReason}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWorkflowControl;