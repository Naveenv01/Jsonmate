import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useTheme } from '../hooks/useTheme';

export interface MonacoJsonEditorRef {
    getValue: () => string;
    setValue: (value: string) => void;
    format: () => void;
}

interface MonacoJsonEditorProps {
    value: string;
    onChange: (value: string) => void;
    showHighlighting?: boolean;
    onFocus?: () => void;
}

export const MonacoJsonEditor = forwardRef<MonacoJsonEditorRef, MonacoJsonEditorProps>(({
    value,
    onChange,
    showHighlighting = true,
    onFocus,
}, ref) => {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const { currentTheme } = useTheme();
    const monacoTheme = currentTheme === 'light' ? 'glassy-light' : 'glassy-dark';

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

    // Update Monaco theme when app theme changes
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({ theme: monacoTheme });
        }
    }, [monacoTheme]);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Subscribe to focus event
        editor.onDidFocusEditorText(() => {
            if (onFocus) {
                onFocus();
            }
        });

        // Define beautiful dark theme with vibrant colors
        monaco.editor.defineTheme('glassy-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'string.key.json', foreground: '7DD3FC' }, // Bright cyan/teal for keys
                { token: 'string.value.json', foreground: '4ADE80' }, // Vibrant green for strings
                { token: 'number', foreground: 'FB923C' }, // Bright orange for numbers
                { token: 'keyword.json', foreground: 'C084FC' }, // Bright purple for keywords
                { token: 'delimiter', foreground: 'E0E7FF' }, // Bright white for delimiters
            ],
            colors: {
                'editor.background': '#00000000',
                'editor.foreground': '#E0E7FF', // Brighter foreground
                'editorLineNumber.foreground': '#64748B',
                'editorLineNumber.activeForeground': '#60A5FA', // Brighter blue
                'editorGutter.background': '#00000000',
                'editor.selectionBackground': '#3B82F680',
                'editor.inactiveSelectionBackground': '#3B82F640',
                'editorCursor.foreground': '#60A5FA', // Bright blue cursor
                'editorGutter.foldingControlForeground': '#60A5FA',
                'editorIndentGuide.background': '#334155',
                'editorIndentGuide.activeBackground': '#475569',
            },
        });

        // Define light theme with high contrast
        monaco.editor.defineTheme('glassy-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'string.key.json', foreground: '0969DA' }, // Blue for keys
                { token: 'string.value.json', foreground: '0A8A42' }, // Green for strings
                { token: 'number', foreground: 'CF5000' }, // Orange for numbers
                { token: 'keyword.json', foreground: '863FAB' }, // Purple for keywords
                { token: 'delimiter', foreground: '57606A' }, // Dark gray for delimiters
            ],
            colors: {
                'editor.background': '#00000000',
                'editor.foreground': '#1F2937',
                'editorLineNumber.foreground': '#9CA3AF',
                'editorLineNumber.activeForeground': '#4B5563',
                'editorGutter.background': '#00000000',
                'editor.selectionBackground': '#DBEAFE',
                'editor.inactiveSelectionBackground': '#E0E7FF',
                'editorCursor.foreground': '#2563EB',
                'editorGutter.foldingControlForeground': '#4B5563',
                'editorIndentGuide.background': '#E5E7EB',
                'editorIndentGuide.activeBackground': '#D1D5DB',
            },
        });

        // Apply the theme based on current app theme
        monaco.editor.setTheme(monacoTheme);

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
                    theme={monacoTheme}
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
