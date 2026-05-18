import {
  AllowanceProvider,
  AllowanceTransfer,
  MaxUint160,
  PermitSingle,
  permit2Address,
} from '@fenine/permit2-sdk'
import { Currency, CurrencyAmount } from '@fenine/sdk-core'
import { UNIVERSAL_ROUTER_ADDRESS, UniversalRouterVersion } from '@fenine/universal-router-sdk'
import dayjs from 'dayjs'
import { BigNumber, providers } from 'ethers'
import { useCallback } from 'react'
import { logger } from 'utilities/src/logger/logger'
import { useAsyncData } from 'utilities/src/react/hooks'
import { currentTimeInSeconds, inXMinutesUnix } from 'utilities/src/time/time'
import { ChainId } from 'wallet/src/constants/chains'
import { Account, AccountType } from 'wallet/src/features/wallet/accounts/types'
import { useProvider, useWalletSigners } from 'wallet/src/features/wallet/context'
import { useActiveAccountWithThrow } from 'wallet/src/features/wallet/hooks'
import { SignerManager } from 'wallet/src/features/wallet/signing/SignerManager'
import { signTypedData } from 'wallet/src/features/wallet/signing/signing'

const PERMIT2_SIG_VALIDITY_TIME = 30 // minutes

function getUniversalRouterVersion(chainId: ChainId): UniversalRouterVersion {
  return chainId === ChainId.Fenine ? UniversalRouterVersion.V2_1_1 : UniversalRouterVersion.V1_2
}

function getPermitStruct(
  tokenAddress: string,
  nonce: number,
  universalRouterAddress: string
): PermitSingle {
  return {
    details: {
      token: tokenAddress,
      amount: MaxUint160,
      // expiration specifies when the allowance will need to be re-set
      expiration: dayjs().add(1, 'month').unix(),
      nonce,
    },
    spender: universalRouterAddress,
    // the time at which the permit signature is invalid
    // can be quite short as we assume this will be submitted right away
    // traditional permit has this as well
    sigDeadline: inXMinutesUnix(PERMIT2_SIG_VALIDITY_TIME),
  }
}

export type PermitSignatureInfo = {
  signature: string
  permitMessage: PermitSingle
  nonce: number
  expiry: number
}

async function getPermit2PermitSignature(
  provider: providers.JsonRpcProvider,
  signerManager: SignerManager,
  account: Account,
  tokenAddress: string,
  chainId: ChainId,
  tokenInAmount: string
): Promise<PermitSignatureInfo | undefined> {
  try {
    if (account.type === AccountType.Readonly) {
      logger.debug(
        'usePermit2PermitSignature',
        'getPermit2Signature',
        'Cannot sign with a view-only wallet'
      )
      return
    }

    const user = account.address
    const currentPermit2Address = permit2Address(chainId)
    const allowanceProvider = new AllowanceProvider(provider, currentPermit2Address)
    const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESS(getUniversalRouterVersion(chainId), chainId)
    const {
      amount: permitAmount,
      expiration,
      nonce,
    } = await allowanceProvider.getAllowanceData(tokenAddress, user, universalRouterAddress)

    if (!permitAmount.lt(tokenInAmount) && expiration > currentTimeInSeconds()) {
      return
    }

    const permitMessage = getPermitStruct(tokenAddress, nonce, universalRouterAddress)
    const { domain, types, values } = AllowanceTransfer.getPermitData(
      permitMessage,
      currentPermit2Address,
      chainId
    )

    const signature = await signTypedData(
      domain,
      types,
      // required to makes values less specific than `Record<string, unknown>`
      // alternative would be to modify the sdk to use type aliases over interfaces
      { ...values },
      account,
      signerManager
    )
    return {
      signature,
      permitMessage,
      nonce,
      expiry: BigNumber.from(permitMessage.sigDeadline).toNumber(),
    }
  } catch (error) {
    logger.error(error, { tags: { file: 'usePermit2Signature', function: 'getPermit2Signature' } })
  }
}

export function usePermit2Signature(currencyInAmount: Maybe<CurrencyAmount<Currency>>): {
  isLoading: boolean
  data: PermitSignatureInfo | undefined
} {
  const signerManager = useWalletSigners()
  const account = useActiveAccountWithThrow()
  const currencyIn = currencyInAmount?.currency
  const provider = useProvider(currencyIn?.chainId ?? ChainId.Mainnet)

  const permitSignatureFetcher = useCallback(() => {
    if (!provider || !currencyIn || currencyIn.isNative) return

    return getPermit2PermitSignature(
      provider,
      signerManager,
      account,
      currencyIn.address,
      currencyIn.chainId,
      currencyInAmount.quotient.toString()
    )
  }, [account, currencyIn, currencyInAmount?.quotient, provider, signerManager])

  return useAsyncData(permitSignatureFetcher)
}
