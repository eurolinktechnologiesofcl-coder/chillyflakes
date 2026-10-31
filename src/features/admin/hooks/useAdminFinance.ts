import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminFinance,
  approvePayoutBatch,
  disbursePayoutBatch,
  generatePayoutBatches,
  type GeneratePayoutBatchesResponse,
} from '../../../api/admin';
import type { AdminFinanceResponse, AdminPayoutBatch } from '../../../types/admin';

export const ADMIN_FINANCE_QUERY_KEY = ['admin', 'finance'] as const;

export function useAdminFinance() {
  const queryClient = useQueryClient();

  const financeQuery = useQuery<AdminFinanceResponse>({
    queryKey: ADMIN_FINANCE_QUERY_KEY,
    queryFn: getAdminFinance,
    staleTime: 30 * 1000,
  });

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ADMIN_FINANCE_QUERY_KEY });
    queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
  };

  const approveBatchMutation = useMutation<AdminPayoutBatch, Error, string>({
    mutationFn: (id: string) => approvePayoutBatch(id),
    onSuccess: invalidateFinance,
  });

  const disburseBatchMutation = useMutation<
    AdminPayoutBatch,
    Error,
    { id: string; utr_reference?: string }
  >({
    mutationFn: ({ id, utr_reference }) => disbursePayoutBatch(id, utr_reference),
    onSuccess: invalidateFinance,
  });

  const generateBatchesMutation = useMutation<GeneratePayoutBatchesResponse, Error, void>({
    mutationFn: () => generatePayoutBatches(),
    onSuccess: invalidateFinance,
  });

  return {
    ...financeQuery,
    approveBatch: approveBatchMutation.mutateAsync,
    isApprovingBatch: approveBatchMutation.isPending,
    disburseBatch: disburseBatchMutation.mutateAsync,
    isDisbursingBatch: disburseBatchMutation.isPending,
    generateBatches: generateBatchesMutation.mutateAsync,
    isGeneratingBatches: generateBatchesMutation.isPending,
  };
}
