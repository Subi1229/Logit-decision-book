import { useEffect, useState } from 'react';

interface Props {
  message: string;
  onDone: () => void;
}

export function Toast({ message, onDone }: Props) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const fadeOut = setTimeout(() => setLeaving(true), 2200);
    const remove = setTimeout(onDone, 2600);
    return () => { clearTimeout(fadeOut); clearTimeout(remove); };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 200,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 16px',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--text)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        animation: leaving
          ? 'toast-out 0.3s ease forwards'
          : 'toast-in 0.2s ease forwards',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          flexShrink: 0,
        }}
      />
      {message}
    </div>
  );
}
