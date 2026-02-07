import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { JsonFormatter } from '../components/JsonFormatter';
import React from 'react';

// Mock Monaco Editor
// Mock Monaco Editor
vi.mock('../components/MonacoJsonEditor', async () => {
    const React = await import('react');
    return {
        MonacoJsonEditor: React.forwardRef(({ value, onChange }: { value: string, onChange: (val: string) => void }, ref) => (
            <textarea
                data-testid="monaco-editor"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        )),
    };
});

// Mock Resizable Panels
vi.mock('../components/ui/resizable', () => ({
    ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => <div data-testid="resizable-group">{children}</div>,
    ResizablePanel: ({ children }: { children: React.ReactNode }) => <div data-testid="resizable-panel">{children}</div>,
    ResizableHandle: () => <div data-testid="resizable-handle" />,
}));

// Mock ActionBar to easily find buttons
// Actually better not to mock it to test integration, but if it has complex logic/icons/hooks, maybe.
// It uses memo, so might be tricky. Let's not mock it first.

describe('Split View Feature', () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it('should toggle split view on button click', async () => {
        render(<JsonFormatter />);

        // Initial state: 1 editor
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(1);

        // Find split button
        const splitButton = screen.getByTitle('Open Split View');
        expect(splitButton).toBeInTheDocument();

        // Click to open split view
        await act(async () => {
            fireEvent.click(splitButton);
        });

        // Should have 2 editors now
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(2);

        // Button title should charge
        expect(screen.getByTitle('Close Split View')).toBeInTheDocument();

        // Click to close split view
        await act(async () => {
            fireEvent.click(screen.getByTitle('Close Split View'));
        });

        // Should have 1 editor again
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(1);
    });

    it('should maintain independent split state per tab', async () => {
        const { getByText } = render(<JsonFormatter />);

        // Initial tab (Tab 1)
        const splitButton = screen.getByTitle('Open Split View');

        // Open split view on Tab 1
        await act(async () => {
            fireEvent.click(splitButton);
        });
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(2);

        // Add new tab
        // Find "plus" icon button in TabBar. 
        // TabBar isn't mocked, so we look for the button with Plus icon.
        // The button has no text, just icon. 
        // We can look for the button by class or structure.
        // In TabBar.tsx: <button onClick={onTabAdd} ... ><Plus ... /></button>
        // It is the last button in the header.

        // For specific selection, we might need a test-id in TabBar. 
        // Or just querySelector.
        const addTabButton = document.querySelector('.lucide-plus')?.closest('button');
        expect(addTabButton).toBeInTheDocument();

        await act(async () => {
            fireEvent.click(addTabButton!);
        });

        // Should switch to Tab 2 automatically? Yes, Logic says: setActiveTabId(newTab.id);
        // Tab 2 should NOT have split view enabled (default: false)
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(1);

        // Switch back to Tab 1 (Untitled)
        // Find tab by text "Untitled"
        await act(async () => {
            fireEvent.click(screen.getByText('Untitled'));
        });

        // Tab 1 should still have split view enabled
        expect(screen.getAllByTestId('monaco-editor')).toHaveLength(2);
    });

    it('should clear split content when closing split view', async () => {
        render(<JsonFormatter />);

        // Open split view
        await act(async () => {
            fireEvent.click(screen.getByTitle('Open Split View'));
        });

        const editors = screen.getAllByTestId('monaco-editor');
        const splitEditor = editors[1]; // Second editor is the split one

        // Type in split editor
        await act(async () => {
            fireEvent.change(splitEditor, { target: { value: 'some split content' } });
        });

        expect(splitEditor).toHaveValue('some split content');

        // Close split view
        await act(async () => {
            fireEvent.click(screen.getByTitle('Close Split View'));
        });

        // Re-open split view
        await act(async () => {
            fireEvent.click(screen.getByTitle('Open Split View'));
        });

        // Content should be empty
        const newEditors = screen.getAllByTestId('monaco-editor');
        expect(newEditors[1]).toHaveValue('');
    });
});
