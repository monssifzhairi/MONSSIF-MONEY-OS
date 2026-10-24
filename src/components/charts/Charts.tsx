/**
 * Professional, restrained charts built on Recharts.
 * Palette: emerald for income, muted red for expenses, graphite surfaces.
 * Gradients are subtle and functional (depth), never decorative noise.
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
  fill: '#67717d',
  fontFamily: 'inherit',
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: '#171b21',
  border: '1px solid #2a313a',
  borderRadius: 10,
  fontSize: 12,
  color: '#f2f5f7',
  fontFamily: 'inherit',
  boxShadow: '0 16px 40px -16px rgba(0,0,0,0.6)',
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
          <defs>
            <linearGradient id="barIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#35e0ab" />
              <stop offset="100%" stopColor="#0d8f6a" />
            </linearGradient>
            <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f28a82" />
              <stop offset="100%" stopColor="#a3443c" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#1d232a" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: '#1d232a' }}
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
            wrapperStyle={{ fontSize: 12, color: '#98a2ae', paddingTop: 8 }}
            formatter={(value: string) => (value === 'income' ? 'Income' : 'Expenses')}
          />
          <Bar dataKey="income" fill="url(#barIncome)" radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="expense" fill="url(#barExpense)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const DONUT_COLORS = [
  '#2dd4a0',
  '#0fa97c',
  '#0b8563',
  '#57e6b8',
  '#8bf0d0',
  '#086f52',
  '#35e0ab',
  '#0d9b73',
  '#065943',
  '#044333',
];

const EXPENSE_COLORS = [
  '#ef7168',
  '#c9554c',
  '#a3443c',
  '#f28a82',
  '#f7aca5',
  '#932f28',
  '#d96359',
  '#7e2a24',
  '#f5b8b2',
  '#61211c',
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
            stroke="#101216"
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
            wrapperStyle={{ fontSize: 11.5, color: '#98a2ae', paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
