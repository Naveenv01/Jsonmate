import React from 'react';
import Plus from 'lucide-react/dist/esm/icons/plus';
import X from 'lucide-react/dist/esm/icons/x';

export interface Tab {
  id: string;
  name: string;
  content: string;
  splitEnabled?: boolean;
  splitContent?: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onTabRename: (id: string, name: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabRename,
}) => {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const handleDoubleClick = (tab: Tab) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
  };

  const handleEditSubmit = (id: string) => {
    if (editValue.trim()) {
      onTabRename(id, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 overflow-x-auto custom-scrollbar">
      {/* Tab container with liquid glass background */}
      <div className="flex items-center gap-0.5 p-1 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/40">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`group relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer shrink-0 border ${activeTabId === tab.id
              ? 'bg-background text-foreground shadow-sm border-border'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
              }`}
            onClick={() => onTabSelect(tab.id)}
          >
            {editingId === tab.id ? (
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => handleEditSubmit(tab.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEditSubmit(tab.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="bg-transparent outline-none w-20 text-foreground"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                onDoubleClick={() => handleDoubleClick(tab)}
                className="whitespace-nowrap"
              >
                {tab.name}
              </span>
            )}

            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-destructive/20 rounded-full p-0.5 transition-all -mr-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add tab button */}
      <button
        onClick={onTabAdd}
        className="p-1.5 ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all shrink-0"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};