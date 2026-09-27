type Point = { label: string; value: number };

const valueFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function MiniLineChart({ data, color = '#005bd3', height = 220 }: { data: Point[]; color?: string; height?: number }) {
  const width = 900;
  const padX = 28;
  const padY = 18;
  const max = Math.max(1, ...data.map((item) => item.value));
  const points = data.map((item, index) => {
    const x = padX + (index / Math.max(1, data.length - 1)) * (width - padX * 2);
    const y = padY + (1 - item.value / max) * (height - padY * 2 - 22);
    return { ...item, x, y };
  });
  const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const area = points.length ? `${line} L ${points.at(-1)?.x} ${height - 28} L ${points[0].x} ${height - 28} Z` : '';

  if (!data.length) return <div className="grid h-52 place-items-center text-sm text-admin-muted">No activity in this period.</div>;
  return <div className="overflow-hidden"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart" className="h-auto min-h-48 w-full overflow-visible">
    <defs><linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.2" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
    {[0.25, 0.5, 0.75, 1].map((ratio) => <line key={ratio} x1={padX} x2={width - padX} y1={padY + ratio * (height - 62)} y2={padY + ratio * (height - 62)} stroke="#e8e8e8" strokeWidth="1" />)}
    <path d={area} fill={`url(#area-${color.replace('#', '')})`} />
    <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {points.map((point, index) => {
      const accessibleLabel = `${point.label}: ${valueFormatter.format(point.value)}`;
      return <g key={`${point.label}-${index}`}><circle cx={point.x} cy={point.y} r="3.5" fill="white" stroke={color} strokeWidth="2.5" aria-label={accessibleLabel}><title suppressHydrationWarning>{accessibleLabel}</title></circle>{(index === 0 || index === points.length - 1 || (data.length <= 14 && index % 2 === 0)) ? <text x={point.x} y={height - 8} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#7a7a7a">{point.label}</text> : null}</g>;
    })}
  </svg></div>;
}
