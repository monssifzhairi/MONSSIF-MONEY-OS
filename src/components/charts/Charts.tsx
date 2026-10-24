/**
 * Professional, restrained charts built on Recharts.
 * Ledger Ivory palette: green for income, warm rust for expenses, quiet
 * hairline grids on ivory surfaces. Gradients are subtle and functional.
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
  fill: '#8a958c',
  fontFamily: 'inherit',
} as const;

const TOOLTIP_STYLE = {
  backgroundColor: '#0c1712',
  border: '1px solid rgba(242,238,228,0.16)',
  borderRadius: 12,
  fontSize: 12,
  color: '#f2eee4',
  fontFamily: 'inherit',
  boxShadow: '0 24px 56px -24px rgba(12,23,18,0.5)',
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
              <stop offset="0%" stopColor="#2FBF6B" />
              <stop offset="100%" stopColor="#158049" />
            </linearGradient>
            <linearGradient id="barExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D97066" />
              <stop offset="100%" stopColor="#B5443A" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e2dac9" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: '#e2dac9' }}
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
            cursor={{ fill: 'rgba(22,33,27,0.05)' }}
            formatter={(value: number, name: string) => [
              formatMAD(value),
              name === 'income' ? 'Income' : 'Expenses',
            ]}
          />
          <Legend
            iconType="square"
            iconSize={9}
            wrapperStyle={{ fontSize: 12, color: '#57655c', paddingTop: 8 }}
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
  '#1B9E5B',
  '#158049',
  '#0e6f3f',
  '#4FCC84',
  '#8FDDAF',
  '#0a5731',
  '#2FBF6B',
  '#117A44',
  '#5CBF8A',
  '#083F24',
];

const EXPENSE_COLORS = [
  '#B5443A',
  '#C4564C',
  '#9E352C',
  '#D97066',
  '#E7A099',
  '#7E2A24',
  '#CA5C52',
  '#61211C',
  '#E5B3AD',
  '#4A1814',
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
            stroke="#0c1712"
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
            wrapperStyle={{ fontSize: 11.5, color: '#57655c', paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
