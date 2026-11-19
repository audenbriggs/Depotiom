import { useQuery } from '@tanstack/react-query';
import type { Abi } from 'viem';
import { CONTRACT_ADDRESS } from '../config/chain';
import { fetchDeployedContractAbi } from '../abi/loader';
import { FALLBACK_DEPOTIOM_ABI, resolveAbiFunctions } from '../abi/normalize';

export function useContractAbi() {
  const query = useQuery({
    queryKey: ['depotiom-abi', CONTRACT_ADDRESS ?? 'none'],
    queryFn: () => fetchDeployedContractAbi(CONTRACT_ADDRESS),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const abi: Abi = query.data?.abi ?? FALLBACK_DEPOTIOM_ABI;
  const functions = query.data?.functions ?? resolveAbiFunctions(FALLBACK_DEPOTIOM_ABI);
  const source = query.data?.source ?? 'fallback';

  return {
    abi,
    functions,
    source,
    isLoading: query.isLoading,
  };
}
