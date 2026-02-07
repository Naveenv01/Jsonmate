import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

export interface MonacoJsonEditorRef {
    getValue: () => string;
    setValue: (value: string) => void;
    format: () => void;
}

interface MonacoJsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    showHighlighting?: boolean;
}

export const MonacoJsonEditor = forwardRef<MonacoJsonEditorRef, MonacoJsonEditorProps>(({
    value,
    onChange,
    showHighlighting = true,
}, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
        getValue: () => {
            return editorRef.current?.getValue() || '';
        },
        setValue: (value: string) => {
            editorRef.current?.setValue(value);
        },
        format: () => {
            const currentValue = editorRef.current?.getValue() || '';
            try {
                const parsed = JSON.parse(currentValue);
                const formatted = JSON.stringify(parsed, null, 2);
                editorRef.current?.setValue(formatted);
                onChange(formatted);
            } catch {
                // If invalid JSON, do nothing
            }
        },
    }), [onChange]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Define custom theme matching glassmorphism dark design
        monaco.editor.defineTheme('glassy-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                // JSON syntax colors matching current theme
                { token: 'string.key.json', foreground: '8BD5CA' }, // Teal for keys
                { token: 'string.value.json', foreground: 'A6DA95' }, // Green for string values
                { token: 'number', foreground: 'F5A97F' }, // Orange for numbers
                { token: 'keyword.json', foreground: 'C6A0F6' }, // Purple for keywords (true/false/null)
                { token: 'delimiter', foreground: 'A5ADCB' }, // Light gray for brackets/colons/commas
            ],
            colors: {
                // Editor background - transparent to show glassmorphism
                'editor.background': '#00000000',
                'editor.foreground': '#CAD3F5',

                // Line numbers and gutter
                'editorLineNumber.foreground': '#5B6078',
                'editorLineNumber.activeForeground': '#8AADF4',
                'editorGutter.background': '#00000000',

                // Selection
                'editor.selectionBackground': '#363A4F80',
                'editor.inactiveSelectionBackground': '#363A4F40',

                // Cursor
                'editorCursor.foreground': '#8AADF4',

                // Folding (collapse/expand)
                'editorGutter.foldingControlForeground': '#8AADF4',

                // Indentation guides
                'editorIndentGuide.background': '#363A4F40',
                'editorIndentGuide.activeBackground': '#5B607860',
            },
        });

        // Apply the custom theme
        monaco.editor.setTheme('glassy-dark');

        // Glassmorphism styles for context menu
        const styleContent = `
            /* Glassmorphism Context Menu Styles */
            .monaco-menu-container {
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
            }
            
            .monaco-menu-container .monaco-scrollable-element {
                background: rgba(17, 24, 39, 0.88) !important;
                backdrop-filter: blur(20px) saturate(150%) !important;
                -webkit-backdrop-filter: blur(20px) saturate(150%) !important;
                border: 1px solid rgba(99, 140, 230, 0.2) !important;
                border-radius: 12px !important;
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.4),
                    0 0 0 1px rgba(255, 255, 255, 0.03) inset !important;
                overflow: hidden !important;
            }
            
            .monaco-menu-container .monaco-menu {
                background: transparent !important;
                padding: 4px !important;
            }
            
            .monaco-menu-container .monaco-action-bar.vertical {
                background: transparent !important;
            }
            
            .monaco-menu-container .actions-container {
                padding: 0 !important;
            }
            
            .monaco-menu-container .action-item {
                margin: 1px 0 !important;
            }
            
            .monaco-menu-container .action-menu-item {
                background: transparent !important;
                border-radius: 6px !important;
                padding: 6px 12px !important;
                margin: 0 4px !important;
                transition: all 0.12s ease-out !important;
            }
            
            .monaco-menu-container .action-item:hover .action-menu-item,
            .monaco-menu-container .action-item.focused .action-menu-item {
                background: rgba(99, 140, 230, 0.15) !important;
            }
            
            .monaco-menu-container .action-label {
                color: rgba(229, 231, 235, 0.9) !important;
                font-size: 13px !important;
                font-weight: 450 !important;
                letter-spacing: 0.01em !important;
            }
            
            .monaco-menu-container .action-item:hover .action-label,
            .monaco-menu-container .action-item.focused .action-label {
                color: rgba(165, 199, 255, 1) !important;
            }
            
            .monaco-menu-container .keybinding {
                color: rgba(148, 163, 184, 0.5) !important;
                font-size: 11px !important;
                font-weight: 400 !important;
                opacity: 0.7 !important;
            }
            
            .monaco-menu-container .action-item:hover .keybinding,
            .monaco-menu-container .action-item.focused .keybinding {
                color: rgba(165, 199, 255, 0.6) !important;
                opacity: 1 !important;
            }
            
            .monaco-menu-container .action-item .action-label.separator {
                background: rgba(99, 140, 230, 0.12) !important;
                height: 1px !important;
                margin: 4px 12px !important;
                padding: 0 !important;
                border: none !important;
            }
        `;
        const styleId = 'monaco-glassy-context-menu';

        // Inject glassmorphism styles into document and all shadow roots
        const injectContextMenuStyles = () => {
            // Inject into document head if not already present
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = styleContent;
                document.head.appendChild(style);
            }

            // Inject into all shadow roots by iterating all elements
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                const shadowHost = el as HTMLElement;
                if (shadowHost.shadowRoot && !shadowHost.shadowRoot.getElementById(styleId)) {
                    const shadowStyle = document.createElement('style');
                    shadowStyle.id = styleId;
                    shadowStyle.textContent = styleContent;
                    shadowHost.shadowRoot.appendChild(shadowStyle);
                }
            });
        };

        // Inject styles immediately
        injectContextMenuStyles();

        // Inject on mousedown to ensure styles are in shadow roots before menu appears
        const handleMouseDown = () => {
            requestAnimationFrame(() => {
                injectContextMenuStyles();
            });
        };
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('contextmenu', handleMouseDown);

        // Enable folding
        editor.updateOptions({
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
            foldingHighlight: true,
        });
    };

    const handleChange = (value: string | undefined) => {
        onChange(value || '');
    };

    return (
        <div className="relative flex-1 min-h-0 w-full h-full overflow-hidden">
            <div className="absolute top-1 bottom-0 left-0 right-0">
                <Editor
                    height="100%"
                    defaultLanguage="json"
                    value={value}
                    theme="glassy-dark"
                    onChange={handleChange}
                    onMount={handleEditorDidMount}
                    options={{
                        minimap: {
                            enabled: false,
                            renderCharacters: false,
                        },
                        stickyScroll: {
                            enabled: false,
                        },
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        wordWrap: 'off',
                        formatOnPaste: true,
                        formatOnType: false,
                        automaticLayout: true,
                        padding: { top: 12, bottom: 12 },
                        smoothScrolling: true,
                        cursorSmoothCaretAnimation: 'on',
                        renderLineHighlight: 'line',
                        renderWhitespace: 'selection',
                        bracketPairColorization: {
                            enabled: true,
                        },
                        folding: true,
                        foldingStrategy: 'indentation',
                        showFoldingControls: 'always',
                        foldingHighlight: true,
                        overviewRulerLanes: 0,
                        hideCursorInOverviewRuler: true,
                        overviewRulerBorder: false,
                        scrollbar: {
                            vertical: 'auto',
                            horizontal: 'auto',
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8,
                            useShadows: false,
                            verticalHasArrows: false,
                            horizontalHasArrows: false,
                        },
                        glyphMargin: false,
                    }}
                />
            </div>
        </div>
    );
});
