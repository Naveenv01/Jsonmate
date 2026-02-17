import React from 'react';
import Sun from 'lucide-react/dist/esm/icons/sun';
import Moon from 'lucide-react/dist/esm/icons/moon';
import Monitor from 'lucide-react/dist/esm/icons/monitor';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle: React.FC = () => {
    const { theme, cycleTheme } = useTheme();

    const icons = {
        light: Sun,
        dark: Moon,
        system: Monitor,
    };

    const Icon = icons[theme];
    const labels = {
        light: 'Light',
        dark: 'Dark',
        system: 'System',
    };

    return (
        <button
            onClick={cycleTheme}
            className="glass-button flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
            title={`Theme: ${labels[theme]} (click to cycle)`}
        >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{labels[theme]}</span>
        </button>
    );
};
