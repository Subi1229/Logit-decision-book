import { useEffect, useState } from 'react';

export interface Settings {
  bodyFont: 'serif' | 'sans';
  weeklyReviewEnabled: boolean;
  revisitPromptsEnabled: boolean;
  revisitThreshold: 30 | 60 | 90;
}

const DEFAULTS: Settings = {
  bodyFont: 'serif',
  weeklyReviewEnabled: true,
  revisitPromptsEnabled: true,
  revisitThreshold: 30,
};

const KEY = 'logit-settings';

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(load);

  useEffect(() => {
    document.documentElement.setAttribute('data-font', settings.bodyFont);
    localStorage.setItem(KEY, JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<Settings>) =>
    setSettings(prev => ({ ...prev, ...patch }));

  return { settings, update };
}
