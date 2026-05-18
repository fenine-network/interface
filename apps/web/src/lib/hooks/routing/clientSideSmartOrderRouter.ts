/**
 * Client-side quote provider using QuoterV2 contract directly.
 * Replaces AlphaRouter to avoid Node.js dependencies in the browser.
 *
 * Supports single-hop V3 swaps on Fenine and other chains.
 */
import { ChainId, CurrencyAmount, Token, TradeType, V3_CORE_FACTORY_ADDRESSES } from '@fenine/sdk-core'
import { computePoolAddress, FeeAmount } from '@fenine/v3-sdk'
import { ethers } from 'ethers'
import { asSupportedChain } from 'constants/chains'
import { DEPRECATED_RPC_PROVIDERS } from 'constants/providers'
import { nativeOnChain } from 'constants/tokens'
import { GetQuoteArgs, QuoteResult, QuoteState, SwapRouterNativeAssets, URAQuoteType } from 'state/routing/types'

// QuoterV2 ABI — only the functions we need
const QUOTER_V2_ABI = [
  'function quoteExactInputSingle(tuple(address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutputSingle(tuple(address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) external returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
]

const V3_POOL_STATE_ABI = [
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16,uint16,uint16,uint8,bool)',
  'function liquidity() external view returns (uint128)',
]

// QuoterV2 addresses per chain — from @fenine/sdk-core CHAIN_TO_ADDRESSES_MAP
const QUOTER_V2_ADDRESSES: { [chainId: number]: string } = {
  920: '0x8585588337487D8218bBe8a7238e2a09226dEecb', // Fenine QuoterV2
  1: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',   // Mainnet
  10: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',  // Optimism
  42161: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Arbitrum
  137: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',  // Polygon
  8453: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',  // Base
}

// Fee tiers to try in order of likelihood
const FEE_TIERS = [FeeAmount.MEDIUM, FeeAmount.LOW, FeeAmount.HIGH, FeeAmount.LOWEST]

// Dummy router object — kept for API compatibility with slice.ts
export function getRouter(chainId: ChainId): any {
  return { chainId }
}

async function getPoolState(
  provider: ethers.providers.Provider,
  chainId: number,
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount
): Promise<{ poolAddress: string; sqrtRatioX96: string; liquidity: string; tickCurrent: string } | null> {
  const factoryAddress = V3_CORE_FACTORY_ADDRESSES[chainId]
  if (!factoryAddress) {
    return null
  }

  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
  const poolAddress = computePoolAddress({ factoryAddress, tokenA: token0, tokenB: token1, fee })
  const poolContract = new ethers.Contract(poolAddress, V3_POOL_STATE_ABI, provider)

  try {
    const [slot0, liquidity] = await Promise.all([poolContract.slot0(), poolContract.liquidity()])
    const sqrtPriceX96 = slot0.sqrtPriceX96?.toString?.() ?? slot0[0]?.toString?.()
    const tickCurrent = slot0.tick?.toString?.() ?? slot0[1]?.toString?.()
    const poolLiquidity = liquidity.toString()

    if (!sqrtPriceX96 || sqrtPriceX96 === '0' || !poolLiquidity || poolLiquidity === '0') {
      return null
    }

    return {
      poolAddress,
      sqrtRatioX96: sqrtPriceX96,
      liquidity: poolLiquidity,
      tickCurrent: tickCurrent ?? '0',
    }
  } catch {
    return null
  }
}

export async function getClientSideQuote(
  {
    tokenInAddress,
    tokenInChainId,
    tokenInDecimals,
    tokenInSymbol,
    tokenOutAddress,
    tokenOutChainId,
    tokenOutDecimals,
    tokenOutSymbol,
    amount,
    tradeType,
  }: GetQuoteArgs,
  _router: any,
  _config: any
): Promise<QuoteResult> {
  try {
    const chainId = tokenInChainId
    const quoterAddress = QUOTER_V2_ADDRESSES[chainId]
    if (!quoterAddress) {
      return { state: QuoteState.NOT_FOUND }
    }

    const supportedChainId = asSupportedChain(chainId)
    if (!supportedChainId) {
      return { state: QuoteState.NOT_FOUND }
    }

    const provider = DEPRECATED_RPC_PROVIDERS[supportedChainId]
    const quoter = new ethers.Contract(quoterAddress, QUOTER_V2_ABI, provider)

    const tokenInIsNative = Object.values(SwapRouterNativeAssets).includes(tokenInAddress as SwapRouterNativeAssets)
    const tokenOutIsNative = Object.values(SwapRouterNativeAssets).includes(tokenOutAddress as SwapRouterNativeAssets)

    const tokenIn = tokenInIsNative
      ? nativeOnChain(chainId).wrapped
      : new Token(chainId, tokenInAddress, tokenInDecimals, tokenInSymbol)
    const tokenOut = tokenOutIsNative
      ? nativeOnChain(chainId).wrapped
      : new Token(chainId, tokenOutAddress, tokenOutDecimals, tokenOutSymbol)

    // Try each fee tier and return the best quote
    let bestAmountOut: ethers.BigNumber | null = null
    let bestAmountIn: ethers.BigNumber | null = null
    let bestFee: FeeAmount = FeeAmount.MEDIUM
    let bestPoolState: Awaited<ReturnType<typeof getPoolState>> | null = null

    for (const fee of FEE_TIERS) {
      try {
        const poolState = await getPoolState(provider, chainId, tokenIn, tokenOut, fee)
        if (!poolState) {
          continue
        }

        if (tradeType === TradeType.EXACT_INPUT) {
          const result = await quoter.callStatic.quoteExactInputSingle({
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            amountIn: amount.toString(),
            fee,
            sqrtPriceLimitX96: 0,
          })
          const amountOut = result[0] as ethers.BigNumber
          if (!bestAmountOut || amountOut.gt(bestAmountOut)) {
            bestAmountOut = amountOut
            bestFee = fee
            bestPoolState = poolState
          }
        } else {
          const result = await quoter.callStatic.quoteExactOutputSingle({
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            amount: amount.toString(),
            fee,
            sqrtPriceLimitX96: 0,
          })
          const amountIn = result[0] as ethers.BigNumber
          if (!bestAmountIn || amountIn.lt(bestAmountIn)) {
            bestAmountIn = amountIn
            bestFee = fee
            bestPoolState = poolState
          }
        }
      } catch {
        // Pool with this fee tier doesn't exist or has no liquidity, try next
        continue
      }
    }

    if (tradeType === TradeType.EXACT_INPUT && !bestAmountOut) {
      return { state: QuoteState.NOT_FOUND }
    }
    if (tradeType === TradeType.EXACT_OUTPUT && !bestAmountIn) {
      return { state: QuoteState.NOT_FOUND }
    }
    if (!bestPoolState) {
      return { state: QuoteState.NOT_FOUND }
    }

    const amountInRaw = tradeType === TradeType.EXACT_INPUT ? amount.toString() : bestAmountIn!.toString()
    const amountOutRaw = tradeType === TradeType.EXACT_INPUT ? bestAmountOut!.toString() : amount.toString()

    const currencyIn = tokenInIsNative ? nativeOnChain(chainId) : tokenIn
    const currencyOut = tokenOutIsNative ? nativeOnChain(chainId) : tokenOut

    const quoteAmount = CurrencyAmount.fromRawAmount(
      tradeType === TradeType.EXACT_INPUT ? currencyOut : currencyIn,
      tradeType === TradeType.EXACT_INPUT ? amountOutRaw : amountInRaw
    )

    return {
      state: QuoteState.SUCCESS,
      data: {
        routing: URAQuoteType.CLASSIC,
        quote: {
          methodParameters: undefined,
          blockNumber: '0',
          amount: amountInRaw,
          amountDecimals: CurrencyAmount.fromRawAmount(currencyIn, amountInRaw).toExact(),
          quote: amountOutRaw,
          quoteDecimals: quoteAmount.toExact(),
          quoteGasAdjusted: amountOutRaw,
          quoteGasAdjustedDecimals: quoteAmount.toExact(),
          gasUseEstimateQuote: '0',
          gasUseEstimateQuoteDecimals: '0',
          gasUseEstimate: '200000',
          gasUseEstimateUSD: '0',
          gasPriceWei: '1000000000',
          route: [
            [
              {
                type: 'v3-pool' as const,
                tokenIn: {
                  chainId: tokenIn.chainId,
                  decimals: tokenIn.decimals,
                  address: tokenIn.address,
                  symbol: tokenIn.symbol,
                },
                tokenOut: {
                  chainId: tokenOut.chainId,
                  decimals: tokenOut.decimals,
                  address: tokenOut.address,
                  symbol: tokenOut.symbol,
                },
                fee: bestFee.toString(),
                address: bestPoolState.poolAddress,
                liquidity: bestPoolState.liquidity,
                sqrtRatioX96: bestPoolState.sqrtRatioX96,
                tickCurrent: bestPoolState.tickCurrent,
                amountIn: amountInRaw,
                amountOut: amountOutRaw,
              },
            ],
          ],
          routeString: `${tokenIn.symbol} → ${tokenOut.symbol}`,
        },
        allQuotes: [],
      },
    }
  } catch (error: any) {
    console.warn('QuoterV2 quote failed:', error?.message ?? error)
    return { state: QuoteState.NOT_FOUND }
  }
}
