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
                        contextmenu: false,
                    }}
                />
            </div>
        </div>
    );
});
