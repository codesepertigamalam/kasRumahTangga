import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  variant?: 'inline' | 'card' | 'fullscreen';
}

export const ErrorDisplay = ({ error, onRetry, variant = 'inline' }: ErrorDisplayProps) => {
  const isNetworkError = error.toLowerCase().includes('tidak dapat terhubung') || 
                         error.toLowerCase().includes('network') ||
                         error.toLowerCase().includes('koneksi');

  if (variant === 'fullscreen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md">
          {isNetworkError ? (
            <WifiOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          ) : (
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          )}
          <h2 className="text-xl font-semibold mb-2">
            {isNetworkError ? 'Tidak Ada Koneksi' : 'Terjadi Kesalahan'}
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <p className="text-sm text-destructive font-medium mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="mr-2 h-3 w-3" />
            Coba Lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Kesalahan</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        {onRetry && (
          <Button onClick={onRetry} variant="ghost" size="sm" className="ml-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
