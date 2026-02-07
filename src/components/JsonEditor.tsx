import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { JsonHighlighter } from './JsonHighlighter';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showHighlighting?: boolean;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  placeholder = 'Paste or type JSON here...',
  readOnly = false,
  showHighlighting = true,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Calculate line numbers
  const lineNumbers = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((_, i) => i + 1);
  }, [value]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      if (highlightRef.current) {
        highlightRef.current.scrollTop = textareaRef.current.scrollTop;
        highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
      }
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }

    // Auto-close brackets and quotes
    const pairs: Record<string, string> = {
      '{': '}',
      '[': ']',
      '"': '"',
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = value.substring(0, start) + e.key + pairs[e.key] + value.substring(end);
      onChange(newValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
    }

    // Auto-indent after { or [
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const beforeCursor = value.substring(0, start);
      const afterCursor = value.substring(start);

      // Get current line indentation
      const lines = beforeCursor.split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^(\s*)/)?.[1] || '';

      // Check if cursor is between brackets
      const charBefore = beforeCursor.slice(-1);
      const charAfter = afterCursor.charAt(0);

      if ((charBefore === '{' && charAfter === '}') || (charBefore === '[' && charAfter === ']')) {
        e.preventDefault();
        const newIndent = indent + '  ';
        const newValue = beforeCursor + '\n' + newIndent + '\n' + indent + afterCursor;
        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
        });
      } else if (charBefore === '{' || charBefore === '[' || charBefore === ',') {
        e.preventDefault();
        const newIndent = charBefore === ',' ? indent : indent + '  ';
        const newValue = beforeCursor + '\n' + newIndent + afterCursor;
        onChange(newValue);

        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
        });
      }
    }
  }, [value, onChange]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 w-12 bg-muted/30 border-r border-border/50 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="p-4 pr-3 text-right">
          {lineNumbers.map((num) => (
            <div
              key={num}
              className="font-mono text-sm leading-relaxed text-muted-foreground/60"
            >
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Editor area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Syntax highlighted layer - behind textarea */}
        {showHighlighting && value && (
          <div
            ref={highlightRef}
            className="absolute inset-0 p-4 overflow-hidden pointer-events-none"
            style={{ zIndex: 1 }}
            aria-hidden="true"
          >
            <JsonHighlighter json={value} />
          </div>
        )}

        {/* Editable textarea - on top */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`json-editor absolute inset-0 p-4 custom-scrollbar resize-none ${showHighlighting && value ? 'text-transparent caret-foreground' : 'text-foreground'
            }`}
          style={{
            zIndex: 2,
            background: 'transparent',
            caretColor: 'hsl(var(--foreground))',
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </div>
    </div>
  );
};
