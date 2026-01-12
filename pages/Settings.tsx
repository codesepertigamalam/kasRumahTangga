import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/hooks/useFinance';
import { formatRupiah } from '@/data/initialData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Pencil, Trash2, Wallet, Tag, Bell } from 'lucide-react';
import { Category, Wallet as WalletType, Reminder, WalletType as WalletTypeEnum } from '@/types/finance';

const EMOJI_OPTIONS = ['🍳', '📚', '💡', '🎬', '💊', '🚗', '🛒', '📦', '💰', '🎁', '🏪', '✨', '🏠', '💳', '📱', '🎮', '👶', '🐕', '✈️', '🍕'];
const WALLET_ICONS = ['👛', '🏦', '📱', '💳', '💰', '🪙'];

const Settings = () => {
  const navigate = useNavigate();
  const {
    categories,
    wallets,
    reminders,
    addCategory,
    updateCategory,
    deleteCategory,
    addWallet,
    updateWallet,
    deleteWallet,
    addReminder,
    updateReminder,
    deleteReminder,
  } = useFinance();

  // Category state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');

  // Wallet state
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletIcon, setWalletIcon] = useState('👛');
  const [walletType, setWalletType] = useState<WalletTypeEnum>('cash');
  const [walletBalance, setWalletBalance] = useState('');

  // Reminder state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderCategoryId, setReminderCategoryId] = useState('');
  const [reminderWalletId, setReminderWalletId] = useState('');
  const [reminderDueDay, setReminderDueDay] = useState('1');

  // Category handlers
  const openCatDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCatName(category.name);
      setCatIcon(category.icon);
      setCatType(category.type);
    } else {
      setEditingCategory(null);
      setCatName('');
      setCatIcon('📦');
      setCatType('expense');
    }
    setCatDialogOpen(true);
  };

  const saveCat = () => {
    if (!catName.trim()) return;
    
    if (editingCategory) {
      updateCategory(editingCategory.id, { name: catName, icon: catIcon, type: catType });
    } else {
      addCategory({ name: catName, icon: catIcon, type: catType, color: 'category-other' });
    }
    setCatDialogOpen(false);
  };

  // Wallet handlers
  const openWalletDialog = (wallet?: WalletType) => {
    if (wallet) {
      setEditingWallet(wallet);
      setWalletName(wallet.name);
      setWalletIcon(wallet.icon);
      setWalletType(wallet.type);
      setWalletBalance(wallet.balance.toString());
    } else {
      setEditingWallet(null);
      setWalletName('');
      setWalletIcon('👛');
      setWalletType('cash');
      setWalletBalance('0');
    }
    setWalletDialogOpen(true);
  };

  const saveWallet = () => {
    if (!walletName.trim()) return;
    
    if (editingWallet) {
      updateWallet(editingWallet.id, { 
        name: walletName, 
        icon: walletIcon, 
        type: walletType,
        balance: parseInt(walletBalance) || 0
      });
    } else {
      addWallet({ 
        name: walletName, 
        icon: walletIcon, 
        type: walletType, 
        balance: parseInt(walletBalance) || 0 
      });
    }
    setWalletDialogOpen(false);
  };

  // Reminder handlers
  const openReminderDialog = (reminder?: Reminder) => {
    if (reminder) {
      setEditingReminder(reminder);
      setReminderTitle(reminder.title);
      setReminderAmount(reminder.amount.toString());
      setReminderCategoryId(reminder.categoryId);
      setReminderWalletId(reminder.walletId);
      setReminderDueDay(reminder.dueDay.toString());
    } else {
      setEditingReminder(null);
      setReminderTitle('');
      setReminderAmount('');
      setReminderCategoryId('');
      setReminderWalletId('');
      setReminderDueDay('1');
    }
    setReminderDialogOpen(true);
  };

  const saveReminder = () => {
    if (!reminderTitle.trim() || !reminderCategoryId || !reminderWalletId) return;
    
    if (editingReminder) {
      updateReminder(editingReminder.id, {
        title: reminderTitle,
        amount: parseInt(reminderAmount) || 0,
        categoryId: reminderCategoryId,
        walletId: reminderWalletId,
        dueDay: parseInt(reminderDueDay) || 1,
      });
    } else {
      addReminder({
        title: reminderTitle,
        amount: parseInt(reminderAmount) || 0,
        categoryId: reminderCategoryId,
        walletId: reminderWalletId,
        dueDay: parseInt(reminderDueDay) || 1,
        isActive: true,
      });
    }
    setReminderDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="container max-w-lg mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-xl">⚙️ Pengaturan</h1>
        </div>

        <Tabs defaultValue="categories">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="categories" className="flex-1">
              <Tag className="w-4 h-4 mr-1" />
              Kategori
            </TabsTrigger>
            <TabsTrigger value="wallets" className="flex-1">
              <Wallet className="w-4 h-4 mr-1" />
              Dompet
            </TabsTrigger>
            <TabsTrigger value="reminders" className="flex-1">
              <Bell className="w-4 h-4 mr-1" />
              Pengingat
            </TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Kategori Saya</h2>
              <Button size="sm" onClick={() => openCatDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah
              </Button>
            </div>

            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between bg-card p-3 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{cat.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cat.type === 'income' ? 'Uang Masuk' : 'Uang Keluar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openCatDialog(cat)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Wallets Tab */}
          <TabsContent value="wallets" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Dompet Saya</h2>
              <Button size="sm" onClick={() => openWalletDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah
              </Button>
            </div>

            <div className="space-y-2">
              {wallets.map((wallet) => (
                <div
                  key={wallet.id}
                  className="flex items-center justify-between bg-card p-3 rounded-xl border border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{wallet.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{wallet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRupiah(wallet.balance)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openWalletDialog(wallet)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteWallet(wallet.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Pengingat Tagihan</h2>
              <Button size="sm" onClick={() => openReminderDialog()}>
                <Plus className="w-4 h-4 mr-1" />
                Tambah
              </Button>
            </div>

            {reminders.length === 0 ? (
              <div className="bg-muted/50 rounded-2xl p-6 text-center">
                <p className="text-muted-foreground text-sm">
                  Belum ada pengingat. Tambahkan untuk mengingatkan tagihan bulanan.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((reminder) => {
                  const category = categories.find((c) => c.id === reminder.categoryId);
                  return (
                    <div
                      key={reminder.id}
                      className="flex items-center justify-between bg-card p-3 rounded-xl border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{category?.icon || '📦'}</span>
                        <div>
                          <p className="font-medium text-sm">{reminder.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRupiah(reminder.amount)} • Tgl {reminder.dueDay}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.isActive}
                          onCheckedChange={(checked) => updateReminder(reminder.id, { isActive: checked })}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openReminderDialog(reminder)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteReminder(reminder.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Category Dialog */}
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nama</label>
                <Input
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Nama kategori"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                        catIcon === emoji ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setCatIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipe</label>
                <Select value={catType} onValueChange={(v) => setCatType(v as 'income' | 'expense')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Uang Keluar</SelectItem>
                    <SelectItem value="income">Uang Masuk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveCat} className="w-full">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Wallet Dialog */}
        <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingWallet ? 'Edit Dompet' : 'Tambah Dompet'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Nama</label>
                <Input
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="Nama dompet"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ikon</label>
                <div className="flex flex-wrap gap-2">
                  {WALLET_ICONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                        walletIcon === emoji ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setWalletIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tipe</label>
                <Select value={walletType} onValueChange={(v) => setWalletType(v as WalletTypeEnum)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Uang Tunai</SelectItem>
                    <SelectItem value="bank">Rekening Bank</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Saldo Awal</label>
                <Input
                  type="number"
                  value={walletBalance}
                  onChange={(e) => setWalletBalance(e.target.value)}
                  placeholder="0"
                />
              </div>
              <Button onClick={saveWallet} className="w-full">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reminder Dialog */}
        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingReminder ? 'Edit Pengingat' : 'Tambah Pengingat'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Judul</label>
                <Input
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Contoh: Listrik PLN"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Nominal</label>
                <Input
                  type="number"
                  value={reminderAmount}
                  onChange={(e) => setReminderAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Kategori</label>
                <Select value={reminderCategoryId} onValueChange={setReminderCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.type === 'expense').map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Dompet</label>
                <Select value={reminderWalletId} onValueChange={setReminderWalletId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih dompet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        {wallet.icon} {wallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Tanggal Jatuh Tempo</label>
                <Select value={reminderDueDay} onValueChange={setReminderDueDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Tanggal {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={saveReminder} className="w-full">Simpan</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Settings;
