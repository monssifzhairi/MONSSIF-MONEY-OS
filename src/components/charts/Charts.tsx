/**
 * Professional, restrained charts built on Recharts.
 * Palette: emerald for income, muted red for expenses, charcoal surfaces.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategorySlice, MonthlyPoint } from '../../lib/calculations';
import { formatMAD, formatMADCompact, formatMonthKey } from '../../lib/format';

const AXIS_STYLE = {
  fontSize: 11,
  fill: '#6d7681',
  fontFamily: 'inherit',
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: '#171a1f',
  border: '1px solid #333a44',
  borderRadius: 10,
  fontSize: 12,
  color: '#f3f5f7',
  fontFamily: 'inherit',
} as const;

export function MonthlyFlowChart({ data }: { data: MonthlyPoint[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatMonthKey(d.label),
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={4}>
          <CartesianGrid stroke="#21252b" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: '#262b33' }}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatMADCompact(v)}
            width={52}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            formatter={(value: number, name: string) => [
              formatMAD(value),
              name === 'income' ? 'Income' : 'Expenses',
            ]}
          />
          <Legend
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: 12, color: '#9aa2ad', paddingTop: 8 }}
            formatter={(value: string) => (value === 'income' ? 'Income' : 'Expenses')}
          />
          <Bar dataKey="income" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill="#e06c65" radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const DONUT_COLORS = [
  '#10b981',
  '#0e9f76',
  '#0b8563',
  '#34d399',
  '#6ee7b7',
  '#a7f3d0',
  '#059669',
  '#047857',
  '#065f46',
  '#064e3b',
];

const EXPENSE_COLORS = [
  '#e06c65',
  '#c95a54',
  '#b34a44',
  '#e98a84',
  '#f0a5a0',
  '#f5c0bc',
  '#a33b35',
  '#8c322d',
  '#752925',
  '#5e201d',
];

export function CategoryDonut({
  data,
  type,
}: {
  data: CategorySlice[];
  type: 'income' | 'expense';
}) {
  const palette = type === 'income' ? DONUT_COLORS : EXPENSE_COLORS;
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.category,
    value: d.total,
  }));

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="#121418"
            strokeWidth={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [formatMAD(value), name]}
          />
          <Legend
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: 11.5, color: '#9aa2ad', paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
