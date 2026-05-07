'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CompetencyData {
  area: string;
  avgScore: number;
}

interface Props {
  data: CompetencyData[];
}

export default function CompetencyChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        No competency data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart layout="vertical" data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <YAxis type="category" dataKey="area" tick={{ fontSize: 12 }} width={140} />
        <Tooltip formatter={(value: number) => [`${value}%`, 'Avg Score']} />
        <Bar dataKey="avgScore" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
