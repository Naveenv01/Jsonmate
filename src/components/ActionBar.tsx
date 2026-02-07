import React from 'react';
import Wand2 from 'lucide-react/dist/esm/icons/wand-2';
import Copy from 'lucide-react/dist/esm/icons/copy';
import Download from 'lucide-react/dist/esm/icons/download';
import GitCompare from 'lucide-react/dist/esm/icons/git-compare';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import Braces from 'lucide-react/dist/esm/icons/braces';
import Columns2 from 'lucide-react/dist/esm/icons/columns-2';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';

interface ActionBarProps {
  onFormat: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onCompare: () => void;
  onSplitToggle: () => void;
  isValid: boolean;
  stats: { keys: number; depth: number; size: string };
  copied: boolean;
  splitEnabled: boolean;
  onClear: () => void;
}

interface ActionButtonProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  onClick: () => void;
}

const ActionButton = React.memo<ActionButtonProps>(({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="glass-button flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
    title={label}
  >
    <Icon className="w-3.5 h-3.5" />
    <span className="hidden sm:inline">{label}</span>
  </button>
));

const ActionBarComponent: React.FC<ActionBarProps> = ({
  onFormat,
  onCopy,
  onDownload,
  onCompare,
  onSplitToggle,
  isValid,
  stats,
  copied,
  splitEnabled,
  onClear,
}) => {
  const CopyIcon = copied ? Check : Copy;
  const copyLabel = copied ? 'Copied!' : 'Copy';

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
      <div className="flex items-center gap-1">
        <button
          onClick={onFormat}
          className="glass-button p-2 mr-1 text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
          title="Format JSON"
        >
          <Braces className="w-5 h-5" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <ActionButton icon={Wand2} label="Format" onClick={onFormat} />
        <div className="w-px h-5 bg-border mx-1" />
        <ActionButton icon={GitCompare} label="Compare" onClick={onCompare} />
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={onSplitToggle}
          className={`glass-button flex items-center gap-1.5 transition-colors ${splitEnabled
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground hover:text-foreground'
            }`}
          title={splitEnabled ? 'Close Split View' : 'Open Split View'}
        >
          <Columns2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Split</span>
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <ActionButton icon={Trash2} label="Clear" onClick={onClear} />
        <div className="w-px h-5 bg-border mx-1" />
        <ActionButton icon={CopyIcon} label={copyLabel} onClick={onCopy} />
        <ActionButton icon={Download} label="Download" onClick={onDownload} />
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {isValid ? (
            <Check className="w-3.5 h-3.5 text-syntax-string" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          )}
          <span>{isValid ? 'Valid JSON' : 'Invalid JSON'}</span>
        </div>
        <span>{stats.keys} keys</span>
        <span>Depth {stats.depth}</span>
        <span>{stats.size}</span>
      </div>
    </div>
  );
};

export const ActionBar = React.memo(ActionBarComponent);