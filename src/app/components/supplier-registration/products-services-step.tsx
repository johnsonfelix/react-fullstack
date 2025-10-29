'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

type CatNode = {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  children?: CatNode[];
};

// helper flatten
const flattenIds = (node: CatNode): string[] => {
  let out = [node.id];
  (node.children || []).forEach((c) => out.push(...flattenIds(c)));
  return out;
};

// filter tree by query (returns pruned tree keeping matching nodes and their ancestors)
const filterTree = (nodes: CatNode[], q: string): CatNode[] => {
  if (!q) return nodes;
  const lower = q.trim().toLowerCase();

  const walk = (n: CatNode): CatNode | null => {
    const match = n.name.toLowerCase().includes(lower) || (n.description || '').toLowerCase().includes(lower);
    const children = (n.children || [])
      .map(walk)
      .filter(Boolean) as CatNode[];
    if (match || children.length > 0) {
      return { ...n, children };
    }
    return null;
  };

  return nodes.map((n) => walk(n)).filter(Boolean) as CatNode[];
};

function CategoryNode({
  node,
  selectedSet,
  toggle,
  level = 0,
  idNameMap,
}: {
  node: CatNode;
  selectedSet: Set<string>;
  toggle: (id: string, checked: boolean, node: CatNode) => void;
  level?: number;
  idNameMap: Map<string, string>;
}) {
  const totalIds = useMemo(() => flattenIds(node), [node]);
  const selectedCount = useMemo(() => totalIds.filter((id) => selectedSet.has(id)).length, [totalIds, selectedSet]);
  const checked = selectedCount === totalIds.length;
  const indeterminate = selectedCount > 0 && selectedCount < totalIds.length;

  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const [expanded, setExpanded] = useState<boolean>(true);

  return (
    <div className="py-1">
      <div className="flex items-center gap-3">
        {node.children && node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="w-6 h-6 inline-flex items-center justify-center text-sm rounded hover:bg-gray-100"
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <div className="w-6" />
        )}

        <label className="inline-flex items-center gap-2 cursor-pointer flex-1">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => toggle(node.id, e.target.checked, node)}
            className="w-4 h-4"
          />
          <div className="flex-1">
            <div className="font-medium text-sm">{node.name}</div>
            {node.description && <div className="text-xs text-gray-500">{node.description}</div>}
          </div>
          <div className="text-xs text-gray-400">{totalIds.length > 1 ? `${totalIds.length}` : ''}</div>
        </label>
      </div>

      {expanded && node.children && node.children.length > 0 && (
        <div className="ml-6 border-l pl-3 mt-2">
          {node.children.map((c) => (
            <CategoryNode key={c.id} node={c} selectedSet={selectedSet} toggle={toggle} level={level + 1} idNameMap={idNameMap} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsServicesStep() {
  const { register, setValue, watch, getValues } = useFormContext();
  const selected = watch('productsAndServices') || [];
  const [tree, setTree] = useState<CatNode[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(false);

  // map id -> name for chips/UI
  const idNameMap = useMemo(() => {
    const m = new Map<string, string>();
    const walk = (nodes: CatNode[]) => {
      nodes.forEach((n) => {
        m.set(n.id, n.name);
        if (n.children) walk(n.children);
      });
    };
    walk(tree);
    return m;
  }, [tree]);

  useEffect(() => {
    setLoading(true);
    fetch('/api/product-categories')
      .then((r) => r.json())
      .then((data) => setTree(data.tree || data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => filterTree(tree, debounced), [tree, debounced]);

  const toggle = useCallback(
    (id: string, checked: boolean, node: CatNode) => {
      const cur = new Set<string>(getValues('productsAndServices') || []);
      if (checked) {
        flattenIds(node).forEach((i) => cur.add(i));
      } else {
        flattenIds(node).forEach((i) => cur.delete(i));
      }
      const arr = Array.from(cur);
      setValue('productsAndServices', arr, { shouldDirty: true, shouldTouch: true });
    },
    [getValues, setValue]
  );

  const selectedSet = useMemo(() => new Set<string>(selected), [selected]);

  const clear = () => setValue('productsAndServices', [], { shouldDirty: true });

  const selectAll = () => {
    const all: string[] = [];
    const walk = (n: CatNode[]) => {
      n.forEach((node) => {
        all.push(node.id);
        if (node.children) walk(node.children);
      });
    };
    walk(tree);
    setValue('productsAndServices', Array.from(new Set(all)), { shouldDirty: true });
  };

  const removeSelected = (id: string) => {
    const cur = new Set<string>(getValues('productsAndServices') || []);
    cur.delete(id);
    setValue('productsAndServices', Array.from(cur), { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Products & Services</h2>
          <p className="text-sm text-gray-500">Choose categories relevant to this supplier's offering.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Selected</div>
          <div className="rounded-md bg-gray-100 px-2 py-1 text-sm font-medium">{selected?.length || 0}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Label>Search categories</Label>
          <Input
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
          <div className="absolute right-3 top-9 text-gray-400 text-sm">🔍</div>
        </div>

        <div className="flex items-end gap-2">
          <Button type="button" variant="secondary" onClick={clear}>Clear</Button>
          <Button type="button" onClick={selectAll}>Select All</Button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 max-h-[420px] overflow-auto border rounded p-4 bg-white shadow-sm">
          {loading ? (
            <div className="text-sm text-gray-500">Loading categories...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-gray-500">No categories found.</div>
          ) : (
            filtered.map((node) => (
              <CategoryNode key={node.id} node={node} selectedSet={selectedSet} toggle={toggle} idNameMap={idNameMap} />
            ))
          )}
        </div>

        <div className="w-72">
          <div className="text-sm font-medium mb-2">Selected items</div>
          <div className="max-h-[420px] overflow-auto border rounded p-3 bg-gray-50">
            {selected.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No categories selected.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {selected.map((id: string) => (
                  <div key={id} className="flex items-center justify-between gap-2 bg-white rounded p-2">
                    <div className="text-sm">{idNameMap.get(id) || id}</div>
                    <button onClick={() => removeSelected(id)} className="text-xs text-red-600">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Register the array field so RHF knows about it */}
      <input type="hidden" {...register('productsAndServices')} />
    </div>
  );
}
