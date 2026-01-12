import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/hooks/useFinance';
import { formatRupiah } from '@/data/initialData';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308', '#06b6d4', '#6b7280'];

const Reports = () => {
  const navigate = useNavigate();
  const { allTransactions, categories, getCategoryById } = useFinance();
  const [period, setPeriod] = useState('this-month');
  const [compareMonth, setCompareMonth] = useState<string>('');

  const now = new Date();

  // Get date range based on period
  const dateRange = useMemo(() => {
    switch (period) {
      case 'this-month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last-month':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'last-3-months':
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case 'last-6-months':
        return { start: startOfMonth(subMonths(now, 5)), end: endOfMonth(now) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, now]);

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) =>
      isWithinInterval(t.date, { start: dateRange.start, end: dateRange.end })
    );
  }, [allTransactions, dateRange]);

  // Summary
  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [filteredTransactions]);

  // Weekly trend data
  const weeklyData = useMemo(() => {
    const weeks = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { weekStartsOn: 1 });
    
    return weeks.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekTransactions = filteredTransactions.filter((t) =>
        isWithinInterval(t.date, { start: weekStart, end: weekEnd })
      );

      const income = weekTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = weekTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        week: format(weekStart, 'd MMM', { locale: idLocale }),
        income,
        expense,
      };
    });
  }, [filteredTransactions, dateRange]);

  // Monthly comparison data
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    
    return months.map((monthStart) => {
      const monthEnd = endOfMonth(monthStart);
      const monthTransactions = allTransactions.filter((t) =>
        isWithinInterval(t.date, { start: monthStart, end: monthEnd })
      );

      const income = monthTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      return {
        month: format(monthStart, 'MMM yy', { locale: idLocale }),
        income,
        expense,
      };
    });
  }, [allTransactions, now]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const expenses = filteredTransactions.filter((t) => t.type === 'expense');
    const byCategory: Record<string, number> = {};

    expenses.forEach((t) => {
      byCategory[t.categoryId] = (byCategory[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = getCategoryById(categoryId);
        return {
          name: category?.name || 'Lainnya',
          icon: category?.icon || '📦',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions, getCategoryById]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const periodLabel = period === 'this-month' ? 'Bulan Ini' : 
                       period === 'last-month' ? 'Bulan Lalu' :
                       period === 'last-3-months' ? '3 Bulan Terakhir' : '6 Bulan Terakhir';

    // Title
    doc.setFontSize(20);
    doc.text('Laporan Keuangan', 14, 22);
    doc.setFontSize(12);
    doc.text(`Periode: ${periodLabel}`, 14, 32);
    doc.text(`Tanggal: ${format(now, 'dd MMMM yyyy', { locale: idLocale })}`, 14, 40);

    // Summary
    doc.setFontSize(14);
    doc.text('Ringkasan', 14, 55);
    doc.setFontSize(11);
    doc.text(`Total Uang Masuk: ${formatRupiah(summary.income)}`, 14, 65);
    doc.text(`Total Uang Keluar: ${formatRupiah(summary.expense)}`, 14, 73);
    doc.text(`Saldo: ${formatRupiah(summary.income - summary.expense)}`, 14, 81);

    // Transaction table
    doc.setFontSize(14);
    doc.text('Detail Transaksi', 14, 96);

    const tableData = filteredTransactions.map((t) => {
      const category = getCategoryById(t.categoryId);
      return [
        format(t.date, 'dd/MM/yy'),
        category?.name || '-',
        t.description || '-',
        t.type === 'income' ? formatRupiah(t.amount) : '-',
        t.type === 'expense' ? formatRupiah(t.amount) : '-',
      ];
    });

    autoTable(doc, {
      startY: 102,
      head: [['Tanggal', 'Kategori', 'Keterangan', 'Masuk', 'Keluar']],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22] },
    });

    // Save PDF
    doc.save(`laporan-keuangan-${format(now, 'yyyy-MM-dd')}.pdf`);
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    const periodLabel = period === 'this-month' ? 'Bulan Ini' : 
                       period === 'last-month' ? 'Bulan Lalu' :
                       period === 'last-3-months' ? '3 Bulan Terakhir' : '6 Bulan Terakhir';
    
    const message = `📊 *Laporan Keuangan ${periodLabel}*\n\n` +
      `💰 Uang Masuk: ${formatRupiah(summary.income)}\n` +
      `💸 Uang Keluar: ${formatRupiah(summary.expense)}\n` +
      `📈 Saldo: ${formatRupiah(summary.income - summary.expense)}\n\n` +
      `_Dibuat dengan Smart Kas Ibu_`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-xl">📊 Laporan</h1>
        </div>

        {/* Period Filter */}
        <div className="mb-6">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Pilih periode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">Bulan Ini</SelectItem>
              <SelectItem value="last-month">Bulan Lalu</SelectItem>
              <SelectItem value="last-3-months">3 Bulan Terakhir</SelectItem>
              <SelectItem value="last-6-months">6 Bulan Terakhir</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-income" />
              <span className="text-sm text-muted-foreground">Uang Masuk</span>
            </div>
            <p className="font-bold text-lg text-income">{formatRupiah(summary.income)}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-expense" />
              <span className="text-sm text-muted-foreground">Uang Keluar</span>
            </div>
            <p className="font-bold text-lg text-expense">{formatRupiah(summary.expense)}</p>
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-6">
          <h3 className="font-semibold mb-4">📈 Tren Mingguan</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                <Tooltip 
                  formatter={(value: number) => formatRupiah(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Line type="monotone" dataKey="income" stroke="hsl(145 50% 55%)" strokeWidth={2} name="Masuk" />
                <Line type="monotone" dataKey="expense" stroke="hsl(0 65% 65%)" strokeWidth={2} name="Keluar" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-6">
          <h3 className="font-semibold mb-4">📊 Perbandingan Bulanan</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                <Tooltip 
                  formatter={(value: number) => formatRupiah(value)}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="income" fill="hsl(145 50% 55%)" name="Masuk" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="hsl(0 65% 65%)" name="Keluar" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-card rounded-2xl p-4 border border-border mb-6">
          <h3 className="font-semibold mb-4">🏷️ Per Kategori</h3>
          {categoryData.length > 0 ? (
            <>
              <div className="h-48 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="amount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatRupiah(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {categoryData.slice(0, 5).map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{cat.icon} {cat.name}</span>
                    </div>
                    <span className="text-sm font-medium">{formatRupiah(cat.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">
              Belum ada data pengeluaran
            </p>
          )}
        </div>

        {/* Export Buttons */}
        <div className="space-y-3">
          <Button onClick={exportToPDF} className="w-full" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Unduh Laporan PDF
          </Button>
          <Button onClick={shareViaWhatsApp} className="w-full bg-green-500 hover:bg-green-600">
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Kirim via WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
