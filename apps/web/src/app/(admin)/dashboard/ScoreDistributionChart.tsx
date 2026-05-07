'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  bucket0_49: number;
  bucket50_59: number;
  bucket60_69: number;
  bucket70_79: number;
  bucket80_89: number;
  bucket90_100: number;
}

export default function ScoreDistributionChart({
  bucket0_49,
  bucket50_59,
  bucket60_69,
  bucket70_79,
  bucket80_89,
  bucket90_100,
}: Props) {
  const data = [
    { name: '0-49', count: bucket0_49 },
    { name: '50-59', count: bucket50_59 },
    { name: '60-69', count: bucket60_69 },
    { name: '70-79', count: bucket70_79 },
    { name: '80-89', count: bucket80_89 },
    { name: '90-100', count: bucket90_100 },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 2" label={{ value: 'Pass threshold', fill: '#ef4444', fontSize: 11 }} />
        <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
