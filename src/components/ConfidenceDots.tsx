interface Props {
  value?: 1 | 2 | 3 | 4 | 5;
}

export function ConfidenceDots({ value }: Props) {
  if (!value) return null;
  const danger = value <= 2;
  const filled = danger ? '#E05252' : 'var(--accent)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: i < value ? filled : 'var(--border)',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      ))}
    </span>
  );
}
