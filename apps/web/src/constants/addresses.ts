import { ChainId } from '@fenine/sdk-core'
import {
  UNIVERSAL_ROUTER_ADDRESS as originalUniversalRouterAddress,
  UniversalRouterVersion,
} from '@fenine/universal-router-sdk'
import { permit2Address } from '@fenine/permit2-sdk'

const FENINE_UNIVERSAL_ROUTER_V2_1_1 = '0x2063600f3B3c7E2BfbE705eA6F607Bad76428Cc2'

/**
 * Returns the Universal Router address for the given chain.
 * Extends the original SDK function with Fenine support.
 */
export function getUniversalRouterAddress(chainId: ChainId): string | undefined {
  if (chainId === ChainId.FENINE) {
    return FENINE_UNIVERSAL_ROUTER_V2_1_1
  }

  try {
    return originalUniversalRouterAddress(UniversalRouterVersion.V1_2, chainId)
  } catch {
    return undefined
  }
}

export function getPermit2Address(chainId: ChainId): string {
  return permit2Address(chainId)
}
