import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatRupiah } from '@/data/initialData';

interface ExpenseData {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
}

interface ExpenseChartProps {
  data: ExpenseData[];
}

const COLORS = [
  '#E8915C', // kitchen
  '#6B9BD1', // school
  '#D4A847', // utility
  '#B794D4', // entertainment
  '#5AB88C', // health
  '#5DA4C7', // transport
  '#D47B9E', // shopping
  '#9BA3B0', // other
];

export const ExpenseChart = ({ data }: ExpenseChartProps) => {
  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-card">
        <h3 className="font-bold text-lg mb-4">📊 Pengeluaran Bulan Ini</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Belum ada pengeluaran</p>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <h3 className="font-bold text-lg mb-4">📊 Pengeluaran Bulan Ini</h3>
      <div className="flex items-center gap-4">
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatRupiah(value)}
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-2">
          {data.slice(0, 4).map((item, index) => (
            <div key={item.categoryId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm flex-1 truncate">{item.icon} {item.name}</span>
              <span className="text-xs text-muted-foreground">
                {Math.round((item.amount / total) * 100)}%
              </span>
            </div>
          ))}
          {data.length > 4 && (
            <p className="text-xs text-muted-foreground pl-5">
              +{data.length - 4} kategori lainnya
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
