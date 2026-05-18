import { Trans } from '@lingui/macro'
import { ChainId, SUPPORTED_CHAINS } from '@fenine/sdk-core'
import { FeeAmount } from '@fenine/v3-sdk'
import type { ReactNode } from 'react'

export const FEE_AMOUNT_DETAIL: Record<
  FeeAmount,
  { label: string; description: ReactNode; supportedChains: readonly ChainId[] }
> = {
  [FeeAmount.LOWEST]: {
    label: '0.01',
    description: <Trans>Best for very stable pairs.</Trans>,
    supportedChains: [
      ChainId.FENINE,
      ChainId.ARBITRUM_ONE,
      ChainId.BNB,
      ChainId.CELO,
      ChainId.CELO_ALFAJORES,
      ChainId.MAINNET,
      ChainId.OPTIMISM,
      ChainId.POLYGON,
      ChainId.POLYGON_MUMBAI,
      ChainId.AVALANCHE,
      ChainId.BASE,
    ],
  },
  [FeeAmount.LOW_200]: {
    label: '0.02',
    description: <Trans>Best for very stable pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
  [FeeAmount.LOW_300]: {
    label: '0.03',
    description: <Trans>Best for stable pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
  [FeeAmount.LOW_400]: {
    label: '0.04',
    description: <Trans>Best for stable pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
  [FeeAmount.LOW]: {
    label: '0.05',
    description: <Trans>Best for stable pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
  [FeeAmount.MEDIUM]: {
    label: '0.3',
    description: <Trans>Best for most pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
  [FeeAmount.HIGH]: {
    label: '1',
    description: <Trans>Best for exotic pairs.</Trans>,
    supportedChains: SUPPORTED_CHAINS,
  },
}
