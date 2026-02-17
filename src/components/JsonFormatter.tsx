import React, { useCallback, useMemo, useRef, useEffect, Suspense } from 'react';
import { TabBar, Tab } from './TabBar';
import { ActionBar } from './ActionBar';
// import { MonacoJsonEditor, MonacoJsonEditorRef } from './MonacoJsonEditor'; // Replaced with lazy
// import { CompareView } from './CompareView'; // Replaced with lazy
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './ui/resizable';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { validateJson, getJsonStats, ValidationResult } from '../utils/jsonUtils';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import { useJsonWorker } from '../hooks/useJsonWorker';
import { useTheme } from '../hooks/useTheme';
import type { MonacoJsonEditorRef } from './MonacoJsonEditor'; // Type only

const MonacoJsonEditor = React.lazy(() => import('./MonacoJsonEditor').then(module => ({ default: module.MonacoJsonEditor })));
const CompareView = React.lazy(() => import('./CompareView').then(module => ({ default: module.CompareView })));

const EditorLoadingSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center bg-transparent">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50" />
  </div>
);

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultTab: Tab = {
  id: generateId(),
  name: 'Tab 1',
  content: '',
  splitEnabled: false,
  splitContent: '',
};

export const JsonFormatter: React.FC = () => {
  // ... (state hooks remain same)
  const [tabs, setTabs] = useLocalStorage<Tab[]>('json-formatter-tabs', [defaultTab]);
  const [activeTabId, setActiveTabId] = useLocalStorage('json-formatter-active-tab', defaultTab.id);
  const [showCompare, setShowCompare] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const primaryEditorRef = useRef<MonacoJsonEditorRef>(null);
  const splitEditorRef = useRef<MonacoJsonEditorRef>(null);
  const [focusedEditor, setFocusedEditor] = React.useState<'primary' | 'split' | null>(null);

  // Web Worker hook
  const { validate, getStats, format } = useJsonWorker();

  // Async state for validation and stats
  const [validation, setValidation] = React.useState<ValidationResult>({ valid: true, parsed: null });
  const [stats, setStats] = React.useState({ keys: 0, depth: 0, size: '0 B' });

  // Track theme
  useTheme();

  const activeTab = useMemo(() =>
    tabs.find(t => t.id === activeTabId) || tabs[0] || defaultTab,
    [tabs, activeTabId]
  );

  // Debounced processing of validation and stats
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!activeTab.content.trim()) {
        if (isMounted) {
          setValidation({ valid: true, parsed: null });
          setStats({ keys: 0, depth: 0, size: '0 B' });
        }
        return;
      }

      try {
        const [validResult, statsResult] = await Promise.all([
          validate(activeTab.content),
          getStats(activeTab.content)
        ]);

        if (isMounted) {
          setValidation(validResult);
          setStats(statsResult);
        }
      } catch (e) {
        console.error('Worker processing error:', e);
      }
    }, 300); // 300ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeTab.content, validate, getStats]);

  // ... (update functions remain same)
  const updateActiveContent = useCallback((content: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, content } : tab
    ));
  }, [activeTabId, setTabs]);

  const updateSplitContent = useCallback((splitContent: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === activeTabId ? { ...tab, splitContent } : tab
    ));
  }, [activeTabId, setTabs]);

  const handleSplitToggle = useCallback(() => {
    setTabs(prev => prev.map(tab => {
      if (tab.id !== activeTabId) return tab;
      if (tab.splitEnabled) {
        return { ...tab, splitEnabled: false, splitContent: '' };
      }
      return { ...tab, splitEnabled: true };
    }));
  }, [activeTabId, setTabs]);

  const renumberTabs = useCallback((currentTabs: Tab[]) => {
    let count = 1;
    return currentTabs.map(tab => {
      // Only rename if it follows the default naming pattern "Tab N"
      if (/^Tab \d+$/.test(tab.name)) {
        return { ...tab, name: `Tab ${count++}` };
      }
      return tab;
    });
  }, []);

  const handleTabAdd = useCallback(() => {
    const newId = generateId();
    setTabs(prev => {
      const newTab: Tab = {
        id: newId,
        name: `Tab ${prev.length + 1}`, // Temporary name, will be renumbered if needed
        content: '',
        splitEnabled: false,
        splitContent: '',
      };
      return renumberTabs([...prev, newTab]);
    });
    setActiveTabId(newId);
  }, [setTabs, setActiveTabId, renumberTabs]);

  const handleTabClose = useCallback((id: string) => {
    setTabs(prev => {
      // 1. Filter out the closed tab
      const filtered = prev.filter(t => t.id !== id);

      // 2. Prevent empty state
      if (filtered.length === 0) {
        const newId = generateId();
        const newTab = { ...defaultTab, id: newId, name: 'Tab 1' };
        setActiveTabId(newId);
        return [newTab];
      }

      // 3. Update active tab if we closed the active one
      if (activeTabId === id) {
        const idx = prev.findIndex(t => t.id === id); // Original index
        // Try to select the previous tab, or the first one if it was first
        // If idx was 0, select new index 0. If idx > 0, select idx - 1.
        const newActiveTab = filtered[idx - 1] || filtered[0];
        setActiveTabId(newActiveTab.id);
      }

      // 4. Renumber remaining tabs
      return renumberTabs(filtered);
    });
  }, [activeTabId, setTabs, setActiveTabId, renumberTabs]);

  const handleTabRename = useCallback((id: string, name: string) => {
    setTabs(prev => prev.map(tab => tab.id === id ? { ...tab, name } : tab));
  }, [setTabs]);

  const handleFormat = useCallback(async () => {
    if (activeTab.content) {
      const formatted = await format(activeTab.content);
      updateActiveContent(formatted);
    }
    if (activeTab.splitEnabled && activeTab.splitContent) {
      const formattedSplit = await format(activeTab.splitContent);
      updateSplitContent(formattedSplit);
    }
  }, [activeTab.content, activeTab.splitEnabled, activeTab.splitContent, format, updateActiveContent, updateSplitContent]);

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

  const handleClear = useCallback(() => {
    if (focusedEditor === 'primary') {
      updateActiveContent('');
    } else if (focusedEditor === 'split') {
      updateSplitContent('');
    }
  }, [focusedEditor, updateActiveContent, updateSplitContent]);

  const openCompare = useCallback(() => setShowCompare(true), []);
  const closeCompare = useCallback(() => setShowCompare(false), []);

  const primaryEditor = useMemo(() => (
    <div className="glass-panel rounded-xl overflow-hidden shadow-glass flex flex-col flex-1 h-full">
      <Suspense fallback={<EditorLoadingSkeleton />}>
        <MonacoJsonEditor
          ref={primaryEditorRef}
          value={activeTab.content}
          onChange={updateActiveContent}
          onFocus={() => setFocusedEditor('primary')}
        />
      </Suspense>
    </div>
  ), [activeTab.content, updateActiveContent]);

  const splitEditor = useMemo(() => (
    activeTab.splitEnabled ? (
      <div className="glass-panel rounded-xl overflow-hidden shadow-glass flex flex-col flex-1 h-full">
        <Suspense fallback={<EditorLoadingSkeleton />}>
          <MonacoJsonEditor
            ref={splitEditorRef}
            value={activeTab.splitContent || ''}
            onChange={updateSplitContent}
            onFocus={() => setFocusedEditor('split')}
          />
        </Suspense>
      </div>
    ) : null
  ), [activeTab.splitEnabled, activeTab.splitContent, updateSplitContent]);

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
          onSplitToggle={handleSplitToggle}
          isValid={validation.valid}
          stats={stats}
          copied={copied}
          splitEnabled={activeTab.splitEnabled || false}
          onClear={handleClear}
        />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 mx-4 mt-4 mb-4 flex flex-col overflow-hidden">
            {activeTab.splitEnabled ? (
              <ResizablePanelGroup direction="horizontal" className="flex-1 h-full gap-1">
                <ResizablePanel defaultSize={50} minSize={25}>
                  {primaryEditor}
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-transparent hover:bg-primary/20 transition-colors w-1 rounded-full" />
                <ResizablePanel defaultSize={50} minSize={25}>
                  {splitEditor}
                </ResizablePanel>
              </ResizablePanelGroup>
            ) : (
              primaryEditor
            )}
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
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
          <CompareView
            initialLeft={activeTab.content}
            onClose={closeCompare}
          />
        </Suspense>
      )}
    </div>
  );
};