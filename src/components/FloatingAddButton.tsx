import { Plus } from 'lucide-react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="btn-quick-add fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
      aria-label="Tambah transaksi"
    >
      <Plus className="w-8 h-8" strokeWidth={3} />
    </button>
  );
};
