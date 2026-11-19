import type { Abi, Address } from 'viem';
import { ARC_EXPLORER_URL } from '../config/chain';
import { FALLBACK_DEPOTIOM_ABI, resolveAbiFunctions, type ResolvedContractFunctions } from './normalize';

export interface LoadedAbiState {
  abi: Abi;
  functions: ResolvedContractFunctions;
  source: 'explorer' | 'fallback';
}

const abiCache = new Map<string, LoadedAbiState>();

function parseRawAbi(raw: unknown): Abi | null {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Abi;
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchDeployedContractAbi(address?: Address): Promise<LoadedAbiState> {
  if (!address) {
    return {
      abi: FALLBACK_DEPOTIOM_ABI,
      functions: resolveAbiFunctions(FALLBACK_DEPOTIOM_ABI),
      source: 'fallback',
    };
  }

  const key = address.toLowerCase();
  const cached = abiCache.get(key);
  if (cached) return cached;

  // 1. Try Blockscout v2 smart-contracts endpoint on ArcScan
  try {
    const resV2 = await fetch(`${ARC_EXPLORER_URL}/api/v2/smart-contracts/${address}`, {
      headers: { Accept: 'application/json' },
    });
    if (resV2.ok) {
      const json = (await resV2.json()) as { abi?: unknown };
      const parsed = parseRawAbi(json?.abi);
      if (parsed) {
        const state: LoadedAbiState = {
          abi: parsed,
          functions: resolveAbiFunctions(parsed),
          source: 'explorer',
        };
        abiCache.set(key, state);
        return state;
      }
    }
  } catch {
    // Fall through to legacy Etherscan-compatible endpoint
  }

  // 2. Try Etherscan-compatible getabi endpoint on ArcScan
  try {
    const resLegacy = await fetch(
      `${ARC_EXPLORER_URL}/api?module=contract&action=getabi&address=${address}`,
      { headers: { Accept: 'application/json' } }
    );
    if (resLegacy.ok) {
      const json = (await resLegacy.json()) as { status?: string; result?: unknown };
      if (json?.status === '1') {
        const parsed = parseRawAbi(json.result);
        if (parsed) {
          const state: LoadedAbiState = {
            abi: parsed,
            functions: resolveAbiFunctions(parsed),
            source: 'explorer',
          };
          abiCache.set(key, state);
          return state;
        }
      }
    }
  } catch {
    // Fall through to typed fallback ABI
  }

  const fallbackState: LoadedAbiState = {
    abi: FALLBACK_DEPOTIOM_ABI,
    functions: resolveAbiFunctions(FALLBACK_DEPOTIOM_ABI),
    source: 'fallback',
  };
  return fallbackState;
}
