const COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6366F1', '#EF4444', '#14B8A6'];

export default function OwnershipPieChart({ data = [] }) {
  if (!data.length) return <div className="text-gray-400 text-center p-4">No ownership data</div>;

  const total = data.reduce((sum, d) => sum + (d.percentage || d.ownership || 0), 0);
  let cumulative = 0;

  const slices = data.map((item, i) => {
    const pct = (item.percentage || item.ownership || 0) / (total || 1);
    const startAngle = cumulative * 360;
    cumulative += pct;
    const endAngle = cumulative * 360;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = 50 + 45 * Math.cos(startRad);
    const y1 = 50 + 45 * Math.sin(startRad);
    const x2 = 50 + 45 * Math.cos(endRad);
    const y2 = 50 + 45 * Math.sin(endRad);

    return (
      <path key={i} d={`M50,50 L${x1},${y1} A45,45 0 ${largeArc},1 ${x2},${y2} Z`}
        fill={COLORS[i % COLORS.length]} />
    );
  });

  return (
    <div className="flex gap-6 items-center">
      <svg viewBox="0 0 100 100" className="w-48 h-48">{slices}</svg>
      <div className="space-y-1">
        {data.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span>{item.name}</span>
            <span className="text-gray-500">{item.percentage || item.ownership}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
