import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TabBar, Tab } from './TabBar';
import { ActionBar } from './ActionBar';
import { MonacoJsonEditor, MonacoJsonEditorRef } from './MonacoJsonEditor';
import { CompareView } from './CompareView';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { validateJson, getJsonStats } from '../utils/jsonUtils';
import { AlertCircle } from 'lucide-react';

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultTab: Tab = {
  id: generateId(),
  name: 'Untitled',
  content: '',
};

export const JsonFormatter: React.FC = () => {
  const [tabs, setTabs] = useLocalStorage<Tab[]>('json-formatter-tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('json-formatter-active-tab', defaultTab.id);
  const [showCompare, setShowCompare] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<MonacoJsonEditorRef>(null);
  // Enforce dark mode permanently
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const activeTab = useMemo(() =>
    tabs.find(t => t.id === activeTabId) || tabs[0] || defaultTab,
    [tabs, activeTabId]
  );

  const validation = useMemo(() => validateJson(activeTab.content), [activeTab.content]);
  const stats = useMemo(() => getJsonStats(activeTab.content), [activeTab.content]);

  const updateActiveContent = useCallback((content: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, content } : tab
    ));
  }, [activeTabId, setTabs]);

  const handleTabAdd = useCallback(() => {
    const newTab: Tab = { id: generateId(), name: `Tab ${tabs.length + 1}`, content: '' };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length, setTabs, setActiveTabId]);

  const handleTabClose = useCallback((id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (filtered.length === 0) return [{ ...defaultTab, id: generateId() }];
      if (activeTabId === id) {
        const idx = prev.findIndex(t => t.id === id);
        setActiveTabId((filtered[idx - 1] || filtered[0]).id);
      }
      return filtered;
    });
  }, [activeTabId, setTabs, setActiveTabId]);

  const handleTabRename = useCallback((id: string, name: string) => {
    setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, name } : tab));
  }, [setTabs]);

  const handleFormat = useCallback(() => editorRef.current?.format(), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(activeTab.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard failed */ }
  }, [activeTab.content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([activeTab.content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab]);

  const openCompare = useCallback(() => setShowCompare(true), []);
  const closeCompare = useCallback(() => setShowCompare(false), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="glass-panel border-b border-border/50">
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSelect={setActiveTabId}
          onTabClose={handleTabClose}
          onTabAdd={handleTabAdd}
          onTabRename={handleTabRename}
        />
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <ActionBar
          onFormat={handleFormat}
          onCopy={handleCopy}
          onDownload={handleDownload}
          onCompare={openCompare}
          isValid={validation.valid}
          stats={stats}
          copied={copied}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 mx-4 mt-4 mb-4 flex overflow-hidden">
            <div className="glass-panel rounded-xl overflow-hidden shadow-glass flex flex-col flex-1">
              <MonacoJsonEditor
                ref={editorRef}
                value={activeTab.content}
                onChange={updateActiveContent}
              />
            </div>
          </div>

          {!validation.valid && validation.error && (
            <div className="fixed bottom-8 left-0 right-0 z-50 px-4 pointer-events-none">
              <div className="max-w-3xl mx-auto pointer-events-auto animate-in">
                <div className="glass-panel rounded-xl border border-destructive/40 bg-destructive/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    <div className="flex-shrink-0 mt-0.5 p-2 rounded-lg bg-destructive/20 ring-1 ring-destructive/30">
                      <AlertCircle className="w-5 h-5 text-destructive" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h4 className="font-semibold text-destructive text-base">JSON Parse Error</h4>
                        {validation.error.line && (
                          <span className="px-2 py-0.5 rounded-md bg-destructive/20 text-destructive text-xs font-mono">
                            Line {validation.error.line}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-destructive/90">{validation.error.message}</p>
                      {validation.error.suggestion && (
                        <p className="text-xs text-destructive/70 pt-1 border-t border-destructive/20 mt-2">
                          → {validation.error.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showCompare && (
        <CompareView
          initialLeft={activeTab.content}
          onClose={closeCompare}
        />
      )}
    </div>
  );
};