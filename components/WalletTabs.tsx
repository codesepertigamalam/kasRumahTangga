import { Wallet } from '@/types/finance';
import { cn } from '@/lib/utils';

interface WalletTabsProps {
  wallets: Wallet[];
  activeWalletId: string | null;
  onWalletChange: (walletId: string | null) => void;
}

export const WalletTabs = ({ wallets, activeWalletId, onWalletChange }: WalletTabsProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      <button
        onClick={() => onWalletChange(null)}
        className={cn(
          'wallet-tab whitespace-nowrap',
          activeWalletId === null && 'wallet-tab-active'
        )}
      >
        🏠 Semua
      </button>
      {wallets.map((wallet) => (
        <button
          key={wallet.id}
          onClick={() => onWalletChange(wallet.id)}
          className={cn(
            'wallet-tab whitespace-nowrap',
            activeWalletId === wallet.id && 'wallet-tab-active'
          )}
        >
          {wallet.icon} {wallet.name}
        </button>
      ))}
    </div>
  );
};
