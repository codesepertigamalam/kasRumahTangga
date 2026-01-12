import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  successMessage?: string;
}

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const execute = useCallback(
    async (
      apiCall: () => Promise<{ data?: T; error?: string }>,
      options?: UseApiOptions<T>
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiCall();

        if (response.error) {
          setError(response.error);
          if (options?.onError) {
            options.onError(response.error);
          } else {
            toast({
              variant: 'destructive',
              title: 'Terjadi Kesalahan',
              description: response.error,
            });
          }
          return null;
        }

        if (response.data) {
          setData(response.data);
          if (options?.successMessage) {
            toast({
              title: 'Berhasil',
              description: options.successMessage,
            });
          }
          options?.onSuccess?.(response.data);
          return response.data;
        }

        return null;
      } catch (err) {
        const errorMessage = 'Terjadi kesalahan yang tidak terduga';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Terjadi Kesalahan',
          description: errorMessage,
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    execute,
    reset,
  };
}

export function useApiMutation() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const mutate = useCallback(
    async <T>(
      apiCall: () => Promise<{ data?: T; error?: string }>,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        onSuccess?: (data: T) => void;
        onError?: (error: string) => void;
      }
    ): Promise<T | null> => {
      setIsLoading(true);

      try {
        const response = await apiCall();

        if (response.error) {
          toast({
            variant: 'destructive',
            title: 'Gagal',
            description: options?.errorMessage || response.error,
          });
          options?.onError?.(response.error);
          return null;
        }

        if (response.data) {
          if (options?.successMessage) {
            toast({
              title: 'Berhasil',
              description: options.successMessage,
            });
          }
          options?.onSuccess?.(response.data);
          return response.data;
        }

        return null;
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Gagal',
          description: options?.errorMessage || 'Terjadi kesalahan yang tidak terduga',
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  return { mutate, isLoading };
}
