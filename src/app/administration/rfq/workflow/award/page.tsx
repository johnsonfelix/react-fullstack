'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

type RuleShape = {
  id?: string;
  type?: string;
  value?: number | string | null;
  description?: string | null;
  categories?: string[] | null;
};

type RuleLocal = {
  id: string;
  type: string;
  value: number | string;
  description: string;
  categories: string[]; // normalized to array of strings
};

export default function AwardPage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<RuleLocal[]>([]);
  const [notificationMapping, setNotificationMapping] = useState<Record<string, any>>({});
  const [newRule, setNewRule] = useState<{ type: string; value: any; description: string; categories?: string }>({
    type: '',
    value: '',
    description: '',
    categories: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // helpers
  const parseCategories = (raw: unknown): string[] => {
    if (Array.isArray(raw)) return raw.map((x) => String(x)).map((s) => s.trim()).filter(Boolean);
    if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const normalizeRuleItem = (rr: unknown): RuleLocal => {
    const rObj = rr as any;
    const id = typeof rObj?.id === 'string' ? rObj.id : `${String(rObj?.type ?? 'rule')}_${Date.now()}`;
    const type = typeof rObj?.type === 'string' ? rObj.type : '';
    const rawValue = rObj?.value ?? rObj?.threshold ?? '';
    const value = typeof rawValue === 'number' ? rawValue : typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
    const description = typeof rObj?.description === 'string' ? rObj.description : '';
    const categories = parseCategories(rObj?.categories);
    return { id, type, value, description, categories };
  };

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const res = await axios.get('/api/admin/workflow/award');
        const data = res.data?.data ?? res.data ?? res;

        // rules
        let fetchedRules: RuleLocal[] = [];
        try {
          const rawRules = data?.rules ?? [];
          if (Array.isArray(rawRules)) {
            fetchedRules = rawRules.map((rr: unknown) => normalizeRuleItem(rr));
          }
        } catch (e) {
          console.warn('normalize rules failed', e);
          fetchedRules = [];
        }

        // notificationMapping
        let fetchedNotif: Record<string, any> = {};
        try {
          const nm = data?.notificationMapping;
          if (typeof nm === 'string') {
            fetchedNotif = JSON.parse(nm);
          } else if (nm && typeof nm === 'object') {
            fetchedNotif = nm;
          } else {
            fetchedNotif = {};
          }
        } catch (e) {
          console.warn('parse notificationMapping failed', e);
          fetchedNotif = {};
        }

        if (!mounted) return;
        setRules(fetchedRules);
        setNotificationMapping(fetchedNotif);
      } catch (err) {
        console.error('Failed to fetch award workflow config', err);
        if (mounted) {
          setRules([]);
          setNotificationMapping({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const addRule = () => {
    const id = `${newRule.type || 'rule'}_${Date.now()}`;
    const categoriesArr = newRule.categories ? newRule.categories.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const valueParsed = newRule.value === '' ? '' : newRule.value;
    const r: RuleLocal = {
      id,
      type: newRule.type || '',
      value: valueParsed,
      description: newRule.description || '',
      categories: categoriesArr,
    };
    setRules((s) => [...s, r]);
    setNewRule({ type: '', value: '', description: '', categories: '' });
    setSaveMessage(null);
  };

  const removeRule = (id: string) => {
    setRules((s) => s.filter((r) => r.id !== id));
    setSaveMessage(null);
  };

  const updateRuleField = (id: string, field: keyof RuleLocal, value: any) => {
    setRules((s) =>
      s.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]:
                field === 'categories'
                  ? (typeof value === 'string' ? value.split(',').map((x) => x.trim()).filter(Boolean) : Array.isArray(value) ? value : [])
                  : value,
            }
          : r
      )
    );
    setSaveMessage(null);
  };

  const onNotificationChange = (text: string) => {
    setSaveMessage(null);
    try {
      const parsed = JSON.parse(text);
      setNotificationMapping(parsed);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e?.message ?? 'Invalid JSON');
    }
  };

  const save = async () => {
    setSaving(true);
    setSaveMessage(null);
    setJsonError(null);

    if (typeof notificationMapping !== 'object' || notificationMapping === null) {
      setJsonError('Notification mapping must be a JSON object');
      setSaving(false);
      return;
    }

    const payloadRules = rules.map((r) => ({
      id: r.id,
      type: r.type,
      value: r.value,
      description: r.description,
      categories: Array.isArray(r.categories) ? r.categories : [],
    }));

    try {
      await axios.post('/api/admin/workflow/award', {
        rules: payloadRules,
        notificationMapping,
      });
      setSaveMessage('Saved award configuration');
    } catch (e) {
      console.error('Failed to save award workflow', e);
      setSaveMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Award Approval Configuration</h2>
      <p className="text-sm text-gray-600">Configure award rules and notification mappings (values come from the database).</p>

      <div className="bg-white border rounded p-4 space-y-4">
        <h3 className="font-medium">Existing Rules</h3>
        {rules.length === 0 && <div className="text-sm text-gray-500">No rules configured.</div>}
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="border rounded p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <select
                    value={r.type}
                    onChange={(e) => updateRuleField(r.id, 'type', e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="">-- select type --</option>
                    <option value="value_threshold">Value Threshold</option>
                    <option value="category_threshold">Category Threshold</option>
                    <option value="require_higher_approval_on_split">Require Higher Approval on Split</option>
                  </select>

                  <input
                    type="text"
                    value={String(r.value ?? '')}
                    onChange={(e) => updateRuleField(r.id, 'value', e.target.value === '' ? '' : e.target.value)}
                    className="border rounded p-1 w-32"
                    placeholder="value"
                  />

                  <button onClick={() => removeRule(r.id)} className="text-sm text-red-600">Remove</button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={r.description ?? ''}
                  onChange={(e) => updateRuleField(r.id, 'description', e.target.value)}
                  className="border rounded p-2 w-full"
                  placeholder="Description (optional)"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={Array.isArray(r.categories) ? r.categories.join(', ') : ''}
                  onChange={(e) => updateRuleField(r.id, 'categories', e.target.value)}
                  className="border rounded p-2 w-full"
                  placeholder="Categories (comma-separated) — used for category_threshold"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border rounded p-4 space-y-4">
        <h3 className="font-medium">Add Rule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={newRule.type}
            onChange={(e) => setNewRule((s) => ({ ...s, type: e.target.value }))}
            className="border rounded p-2"
          >
            <option value="">-- select type --</option>
            <option value="value_threshold">Value Threshold</option>
            <option value="category_threshold">Category Threshold</option>
            <option value="require_higher_approval_on_split">Require Higher Approval on Split</option>
          </select>
          <input
            type="text"
            value={String(newRule.value)}
            onChange={(e) => setNewRule((s) => ({ ...s, value: e.target.value }))}
            className="border rounded p-2"
            placeholder="value (leave empty if N/A)"
          />
          <input
            type="text"
            value={newRule.description}
            onChange={(e) => setNewRule((s) => ({ ...s, description: e.target.value }))}
            className="border rounded p-2"
            placeholder="Description"
          />
        </div>

        <div>
          <input
            type="text"
            value={newRule.categories ?? ''}
            onChange={(e) => setNewRule((s) => ({ ...s, categories: e.target.value }))}
            className="border rounded p-2 w-full"
            placeholder="Categories (comma-separated) — only for category_threshold"
          />
        </div>

        <div className="flex justify-end">
          <button onClick={addRule} className="px-4 py-2 bg-blue-600 text-white rounded">+ Add Award Rule</button>
        </div>
      </div>



      <div className="flex justify-end gap-3 items-center">
        {saveMessage && <div className="text-sm text-gray-700">{saveMessage}</div>}
        <button
          onClick={save}
          disabled={saving || !!jsonError}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
