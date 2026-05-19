import { gql, useQuery } from '@apollo/client'
import { ChainId } from '@fenine/sdk-core'
import { useWeb3React } from '@web3-react/core'
import AssetLogo from 'components/Logo/AssetLogo'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { ArrowUpRight } from 'react-feather'
import { Link, useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { ExternalLink, ThemedText } from 'theme/components'
import { isAddress, shortenAddress } from 'utils/addresses'
import { NumberType, useFormatter } from 'utils/formatNumbers'
import { ExplorerDataType, getExplorerLink } from 'utils/getExplorerLink'

const FENINE_CHAIN_ID = ChainId.FENINE
const DEFAULT_PAGE_SIZE = 25
const DETAIL_POOL_PAGE_SIZE = 20
const DETAIL_TOKEN_POOL_PAGE_SIZE = 12
const DETAIL_TOKEN_SWAP_PAGE_SIZE = 20
const SUMMARY_POOL_LIMIT = 1000
const SUMMARY_SWAP_LIMIT = 1000

enum ExplorerTab {
  Activity = 'activity',
  Pairs = 'pairs',
  Tokens = 'tokens',
  Wallet = 'wallet',
}

enum VolumeRange {
  H1 = '1h',
  D1 = '1d',
  W1 = '1w',
  M1 = '1m',
  Y1 = '1y',
}

type ExplorerToken = {
  id: string
  symbol: string
  name: string
}

type ExplorerPool = {
  id: string
  feeTier: string
  createdAtTimestamp?: string
  createdAtBlockNumber?: string
  totalValueLockedUSD: string
  volumeUSD: string
  feesUSD: string
  txCount: string
  token0Price?: string
  token1Price?: string
  tick?: string | null
  token0: ExplorerToken
  token1: ExplorerToken
}

type ExplorerSwap = {
  id: string
  timestamp: string
  origin: string
  amount0: string
  amount1: string
  amountUSD: string
  token0: ExplorerToken
  token1: ExplorerToken
  pool: ExplorerPool
  transaction: {
    id: string
    blockNumber: string
  }
}

type ExplorerTopToken = ExplorerToken & {
  volumeUSD: string
  totalValueLockedUSD: string
  txCount: string
  poolCount: string
  totalSupply?: string
  derivedETH?: string
}

type ActivityQueryResult = {
  _meta: {
    block: {
      number: number
    }
  }
  swaps: ExplorerSwap[]
}

type ExplorerSummaryQueryResult = {
  pools: Pick<ExplorerPool, 'id' | 'totalValueLockedUSD'>[]
  swaps: Pick<ExplorerSwap, 'id' | 'amountUSD' | 'origin'>[]
}

type PoolsQueryResult = {
  pools: ExplorerPool[]
}

type TokensQueryResult = {
  tokens: ExplorerTopToken[]
}

type PoolDetailQueryResult = {
  pool: ExplorerPool | null
  swaps: ExplorerSwap[]
}

type TokenDetailQueryResult = {
  token: ExplorerTopToken | null
  token0Pools: ExplorerPool[]
  token1Pools: ExplorerPool[]
  token0Swaps: ExplorerSwap[]
  token1Swaps: ExplorerSwap[]
}

const EXPLORER_ACTIVITY_QUERY = gql`
  query ExplorerActivity($first: Int!, $skip: Int!) {
    _meta {
      block {
        number
      }
    }
    swaps(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      origin
      amount0
      amount1
      amountUSD
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      pool {
        id
        feeTier
        createdAtTimestamp
        createdAtBlockNumber
        totalValueLockedUSD
        volumeUSD
        feesUSD
        txCount
        token0Price
        token1Price
        tick
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
      }
      transaction {
        id
        blockNumber
      }
    }
  }
`

const EXPLORER_POOLS_QUERY = gql`
  query ExplorerPools($first: Int!, $skip: Int!) {
    pools(first: $first, skip: $skip, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      feeTier
      createdAtTimestamp
      createdAtBlockNumber
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0Price
      token1Price
      tick
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
  }
`

const EXPLORER_SUMMARY_QUERY = gql`
  query ExplorerSummary($firstPools: Int!, $firstSwaps: Int!, $timestampGte: BigInt!) {
    pools(first: $firstPools, orderBy: totalValueLockedUSD, orderDirection: desc) {
      id
      totalValueLockedUSD
    }
    swaps(first: $firstSwaps, where: { timestamp_gte: $timestampGte }, orderBy: timestamp, orderDirection: desc) {
      id
      amountUSD
      origin
    }
  }
`

const EXPLORER_TOKENS_QUERY = gql`
  query ExplorerTokens($first: Int!, $skip: Int!) {
    tokens(first: $first, skip: $skip, orderBy: volumeUSD, orderDirection: desc) {
      id
      symbol
      name
      volumeUSD
      totalValueLockedUSD
      txCount
      poolCount
      totalSupply
      derivedETH
    }
  }
`

const EXPLORER_WALLET_QUERY = gql`
  query ExplorerWallet($first: Int!, $origin: Bytes!, $skip: Int!) {
    swaps(first: $first, skip: $skip, where: { origin: $origin }, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      origin
      amount0
      amount1
      amountUSD
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      pool {
        id
        feeTier
        createdAtTimestamp
        createdAtBlockNumber
        totalValueLockedUSD
        volumeUSD
        feesUSD
        txCount
        token0Price
        token1Price
        tick
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
      }
      transaction {
        id
        blockNumber
      }
    }
  }
`

const EXPLORER_POOL_DETAIL_QUERY = gql`
  query ExplorerPoolDetail($poolId: ID!, $first: Int!, $skip: Int!) {
    pool(id: $poolId) {
      id
      feeTier
      createdAtTimestamp
      createdAtBlockNumber
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0Price
      token1Price
      tick
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
    swaps(first: $first, skip: $skip, where: { pool: $poolId }, orderBy: timestamp, orderDirection: desc) {
      id
      timestamp
      origin
      amount0
      amount1
      amountUSD
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      pool {
        id
        feeTier
        totalValueLockedUSD
        volumeUSD
        feesUSD
        txCount
        token0Price
        token1Price
        tick
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
      }
      transaction {
        id
        blockNumber
      }
    }
  }
`

const EXPLORER_TOKEN_DETAIL_QUERY = gql`
  query ExplorerTokenDetail($tokenId: ID!, $firstPools: Int!, $skipPools: Int!, $firstSwaps: Int!, $skipSwaps: Int!) {
    token(id: $tokenId) {
      id
      symbol
      name
      volumeUSD
      totalValueLockedUSD
      txCount
      poolCount
      totalSupply
      derivedETH
    }
    token0Pools: pools(
      first: $firstPools
      skip: $skipPools
      where: { token0: $tokenId }
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      feeTier
      createdAtTimestamp
      createdAtBlockNumber
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0Price
      token1Price
      tick
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
    token1Pools: pools(
      first: $firstPools
      skip: $skipPools
      where: { token1: $tokenId }
      orderBy: totalValueLockedUSD
      orderDirection: desc
    ) {
      id
      feeTier
      createdAtTimestamp
      createdAtBlockNumber
      totalValueLockedUSD
      volumeUSD
      feesUSD
      txCount
      token0Price
      token1Price
      tick
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
    }
    token0Swaps: swaps(
      first: $firstSwaps
      skip: $skipSwaps
      where: { token0: $tokenId }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      timestamp
      origin
      amount0
      amount1
      amountUSD
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      pool {
        id
        feeTier
        totalValueLockedUSD
        volumeUSD
        feesUSD
        txCount
        token0Price
        token1Price
        tick
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
      }
      transaction {
        id
        blockNumber
      }
    }
    token1Swaps: swaps(
      first: $firstSwaps
      skip: $skipSwaps
      where: { token1: $tokenId }
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      timestamp
      origin
      amount0
      amount1
      amountUSD
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      pool {
        id
        feeTier
        totalValueLockedUSD
        volumeUSD
        feesUSD
        txCount
        token0Price
        token1Price
        tick
        token0 {
          id
          symbol
          name
        }
        token1 {
          id
          symbol
          name
        }
      }
      transaction {
        id
        blockNumber
      }
    }
  }
`

const PageWrapper = styled.div`
  width: 100%;
  max-width: 1440px;
  padding: 32px 16px 0;

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    padding-top: 20px;
  }
`

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 auto 24px;
  max-width: 1240px;
`

const TabsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 24px auto 20px;
  max-width: 1240px;
`

const TabButton = styled.button<{ active: boolean }>`
  border: 1px solid ${({ theme, active }) => (active ? theme.accent1 : theme.surface3)};
  background: ${({ theme, active }) => (active ? theme.accent1 : theme.surface1)};
  color: ${({ theme, active }) => (active ? theme.accent2 : theme.neutral2)};
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all ${({ theme }) => `${theme.transition.duration.fast} ${theme.transition.timing.ease}`};
`

const RangeButtonGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const RangeButton = styled.button<{ active: boolean }>`
  border: 1px solid ${({ theme, active }) => (active ? theme.accent1 : theme.surface3)};
  background: ${({ theme, active }) => (active ? theme.accent1 : theme.surface1)};
  color: ${({ theme, active }) => (active ? theme.accent2 : theme.neutral2)};
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all ${({ theme }) => `${theme.transition.duration.fast} ${theme.transition.timing.ease}`};
`

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 0 auto 20px;
  max-width: 1240px;

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.lg}px`}) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    grid-template-columns: 1fr;
  }
`

const StatCard = styled.div`
  background: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 20px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ContentCard = styled.div`
  background: ${({ theme }) => theme.surface1};
  border: 1px solid ${({ theme }) => theme.surface3};
  border-radius: 24px;
  margin: 0 auto;
  max-width: 1240px;
  overflow: hidden;
`

const TableScroll = styled.div`
  overflow-x: auto;
`

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
`

const HeadCell = styled.th`
  text-align: left;
  padding: 14px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.surface3};
  color: ${({ theme }) => theme.neutral2};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
`

const BodyCell = styled.td`
  padding: 16px 18px;
  border-bottom: 1px solid ${({ theme }) => theme.surface3};
  vertical-align: top;
`

const PairCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const PairLogoStack = styled.div`
  display: flex;
  align-items: center;
`

const OverlapLogo = styled.div`
  margin-left: -8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surface1};
`

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: ${({ theme }) => theme.surface2};
  color: ${({ theme }) => theme.neutral2};
  font-size: 12px;
  font-weight: 600;
`

const WalletBar = styled.form`
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 0 auto 20px;
  max-width: 1240px;

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    flex-direction: column;
    align-items: stretch;
  }
`

const WalletInput = styled.input`
  flex: 1;
  height: 48px;
  border-radius: 18px;
  border: 1px solid ${({ theme }) => theme.surface3};
  background: ${({ theme }) => theme.surface1};
  color: ${({ theme }) => theme.neutral1};
  padding: 0 16px;
  font-size: 15px;

  &::placeholder {
    color: ${({ theme }) => theme.neutral3};
  }
`

const PrimaryButton = styled.button`
  height: 48px;
  border: none;
  border-radius: 18px;
  padding: 0 18px;
  background: ${({ theme }) => theme.accent1};
  color: ${({ theme }) => theme.accent2};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const SecondaryButton = styled.button<{ disabled?: boolean }>`
  height: 42px;
  border-radius: 16px;
  padding: 0 14px;
  border: 1px solid ${({ theme }) => theme.surface3};
  background: ${({ theme }) => theme.surface1};
  color: ${({ theme, disabled }) => (disabled ? theme.neutral3 : theme.neutral1)};
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ disabled }) => (disabled ? 0.65 : 1)};
`

const EmptyState = styled.div`
  padding: 28px 20px;
  text-align: center;
`

const PaginationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-top: 1px solid ${({ theme }) => theme.surface3};

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    flex-direction: column;
    align-items: stretch;
  }
`

const PaginationActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  @media screen and (max-width: ${({ theme }) => `${theme.breakpoint.md}px`}) {
    justify-content: stretch;
  }
`

const InlineLink = styled(Link)`
  color: ${({ theme }) => theme.accent1};
  text-decoration: none;

  &:hover {
    opacity: ${({ theme }) => theme.opacity.hover};
  }
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const Breadcrumbs = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

const BreadcrumbSeparator = styled.span`
  color: ${({ theme }) => theme.neutral3};
  font-size: 14px;
`

const DetailHero = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
`

const DetailTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
`

const PairLogos = ({ token0, token1 }: { token0: ExplorerToken; token1: ExplorerToken }) => (
  <PairLogoStack>
    <AssetLogo chainId={FENINE_CHAIN_ID} address={token0.id} symbol={token0.symbol} />
    <OverlapLogo>
      <AssetLogo chainId={FENINE_CHAIN_ID} address={token1.id} symbol={token1.symbol} />
    </OverlapLogo>
  </PairLogoStack>
)

function parseAmount(value?: string | null) {
  return value ? Math.abs(Number(value)) : 0
}

function formatFeeTier(feeTier: string) {
  return `${(Number(feeTier) / 10000).toFixed(Number(feeTier) >= 10000 ? 0 : 2)}%`
}

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(Number(timestamp) * 1000))
}

function getVolumeRangeLabel(range: VolumeRange) {
  switch (range) {
    case VolumeRange.H1:
      return '1H'
    case VolumeRange.D1:
      return '1D'
    case VolumeRange.W1:
      return '1W'
    case VolumeRange.M1:
      return '1M'
    case VolumeRange.Y1:
      return '1Y'
  }
}

function getVolumeRangeSeconds(range: VolumeRange) {
  switch (range) {
    case VolumeRange.H1:
      return 60 * 60
    case VolumeRange.D1:
      return 60 * 60 * 24
    case VolumeRange.W1:
      return 60 * 60 * 24 * 7
    case VolumeRange.M1:
      return 60 * 60 * 24 * 30
    case VolumeRange.Y1:
      return 60 * 60 * 24 * 365
  }
}

function formatUsdCompactEnglish(input: number) {
  if (!Number.isFinite(input)) {
    return '-'
  }

  if (input === 0) {
    return '-'
  }

  if (Math.abs(input) < 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(input)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(input)
}

function dedupePools(pools: ExplorerPool[]) {
  return Array.from(new Map(pools.map((pool) => [pool.id.toLowerCase(), pool])).values())
}

function dedupeSwaps(swaps: ExplorerSwap[]) {
  return Array.from(new Map(swaps.map((swap) => [swap.id.toLowerCase(), swap])).values()).sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp)
  )
}

function InfoStatCard({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <StatCard>
      <ThemedText.LabelSmall>{label}</ThemedText.LabelSmall>
      <ThemedText.HeadlineLarge>{value}</ThemedText.HeadlineLarge>
      {hint ? <ThemedText.LabelSmall>{hint}</ThemedText.LabelSmall> : null}
    </StatCard>
  )
}

function ExplorerTableMessage({ message }: { message: ReactNode }) {
  return (
    <ContentCard>
      <EmptyState>
        <ThemedText.BodyPrimary textAlign="center">{message}</ThemedText.BodyPrimary>
      </EmptyState>
    </ContentCard>
  )
}

function TablePagination({
  currentPage,
  hasNextPage,
  itemCount,
  pageSize,
  onPrevious,
  onNext,
}: {
  currentPage: number
  hasNextPage: boolean
  itemCount: number
  pageSize: number
  onPrevious: () => void
  onNext: () => void
}) {
  return (
    <PaginationRow>
      <ThemedText.BodySecondary>
        Showing {itemCount ? (currentPage - 1) * pageSize + 1 : 0}-
        {itemCount ? (currentPage - 1) * pageSize + itemCount : 0} results
      </ThemedText.BodySecondary>
      <PaginationActions>
        <SecondaryButton disabled={currentPage === 1} onClick={onPrevious} type="button">
          Previous
        </SecondaryButton>
        <ThemedText.BodySecondary>Page {currentPage}</ThemedText.BodySecondary>
        <SecondaryButton disabled={!hasNextPage} onClick={onNext} type="button">
          Next
        </SecondaryButton>
      </PaginationActions>
    </PaginationRow>
  )
}

function ActivityTable({
  swaps,
  currentPage,
  pageSize,
  onPreviousPage,
  onNextPage,
}: {
  swaps: ExplorerSwap[]
  currentPage: number
  pageSize: number
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  const { formatNumber } = useFormatter()

  if (!swaps.length) {
    return <ExplorerTableMessage message="No indexed swap activity found yet." />
  }

  return (
    <ContentCard>
      <TableScroll>
        <StyledTable>
          <thead>
            <tr>
              <HeadCell>Date</HeadCell>
              <HeadCell>Pair</HeadCell>
              <HeadCell>Action</HeadCell>
              <HeadCell>Amount</HeadCell>
              <HeadCell>Value</HeadCell>
              <HeadCell>Wallet</HeadCell>
              <HeadCell>Tx</HeadCell>
            </tr>
          </thead>
          <tbody>
            {swaps.map((swap) => (
              <tr key={swap.id}>
                <BodyCell>
                  <ThemedText.BodyPrimary>{formatTimestamp(swap.timestamp)}</ThemedText.BodyPrimary>
                  <ThemedText.LabelSmall>Block #{swap.transaction.blockNumber}</ThemedText.LabelSmall>
                </BodyCell>
                <BodyCell>
                  <PairCell>
                    <PairLogos token0={swap.token0} token1={swap.token1} />
                    <div>
                      <ThemedText.BodyPrimary>
                        {swap.token0.symbol} / {swap.token1.symbol}
                      </ThemedText.BodyPrimary>
                      <ThemedText.LabelSmall>{formatFeeTier(swap.pool.feeTier)}</ThemedText.LabelSmall>
                    </div>
                  </PairCell>
                </BodyCell>
                <BodyCell>
                  <Badge>Swap</Badge>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(swap.amount0), type: NumberType.TokenTx })} {swap.token0.symbol}
                  </ThemedText.BodyPrimary>
                  <ThemedText.LabelSmall>
                    {formatNumber({ input: parseAmount(swap.amount1), type: NumberType.TokenTx })} {swap.token1.symbol}
                  </ThemedText.LabelSmall>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(swap.amountUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <InlineLink to={`/explorer/address/${swap.origin.toLowerCase()}`}>
                    {shortenAddress(swap.origin)}
                  </InlineLink>
                </BodyCell>
                <BodyCell>
                  <ExternalLink
                    href={getExplorerLink(FENINE_CHAIN_ID, swap.transaction.id, ExplorerDataType.TRANSACTION)}
                  >
                    <ThemedText.Link>
                      {shortenAddress(swap.transaction.id)}
                      <ArrowUpRight size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />
                    </ThemedText.Link>
                  </ExternalLink>
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableScroll>
      <TablePagination
        currentPage={currentPage}
        hasNextPage={swaps.length >= pageSize}
        itemCount={swaps.length}
        pageSize={pageSize}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
      />
    </ContentCard>
  )
}

function PairsTable({
  pools,
  currentPage,
  pageSize,
  onPreviousPage,
  onNextPage,
}: {
  pools: ExplorerPool[]
  currentPage: number
  pageSize: number
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  const { formatNumber } = useFormatter()

  if (!pools.length) {
    return <ExplorerTableMessage message="No active pools have been indexed yet." />
  }

  return (
    <ContentCard>
      <TableScroll>
        <StyledTable>
          <thead>
            <tr>
              <HeadCell>Pair</HeadCell>
              <HeadCell>Fee</HeadCell>
              <HeadCell>TVL</HeadCell>
              <HeadCell>Volume</HeadCell>
              <HeadCell>Fees</HeadCell>
              <HeadCell>Transactions</HeadCell>
              <HeadCell>Pool</HeadCell>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.id}>
                <BodyCell>
                  <PairCell>
                    <PairLogos token0={pool.token0} token1={pool.token1} />
                    <div>
                      <InlineLink to={`/explorer/pairs/${pool.id.toLowerCase()}`}>
                        {pool.token0.symbol} / {pool.token1.symbol}
                      </InlineLink>
                      <ThemedText.LabelSmall>{shortenAddress(pool.id)}</ThemedText.LabelSmall>
                    </div>
                  </PairCell>
                </BodyCell>
                <BodyCell>
                  <Badge>{formatFeeTier(pool.feeTier)}</Badge>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(pool.totalValueLockedUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(pool.volumeUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(pool.feesUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(pool.txCount), type: NumberType.WholeNumber })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ExternalLink href={getExplorerLink(FENINE_CHAIN_ID, pool.id, ExplorerDataType.ADDRESS)}>
                    <ThemedText.Link>
                      {shortenAddress(pool.id)}
                      <ArrowUpRight size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />
                    </ThemedText.Link>
                  </ExternalLink>
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableScroll>
      <TablePagination
        currentPage={currentPage}
        hasNextPage={pools.length >= pageSize}
        itemCount={pools.length}
        pageSize={pageSize}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
      />
    </ContentCard>
  )
}

function TokensTable({
  tokens,
  currentPage,
  pageSize,
  onPreviousPage,
  onNextPage,
}: {
  tokens: ExplorerTopToken[]
  currentPage: number
  pageSize: number
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  const { formatNumber } = useFormatter()

  if (!tokens.length) {
    return <ExplorerTableMessage message="No active tokens have been indexed yet." />
  }

  return (
    <ContentCard>
      <TableScroll>
        <StyledTable>
          <thead>
            <tr>
              <HeadCell>Token</HeadCell>
              <HeadCell>Volume</HeadCell>
              <HeadCell>TVL</HeadCell>
              <HeadCell>Pools</HeadCell>
              <HeadCell>Transactions</HeadCell>
              <HeadCell>Address</HeadCell>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr key={token.id}>
                <BodyCell>
                  <PairCell>
                    <AssetLogo chainId={FENINE_CHAIN_ID} address={token.id} symbol={token.symbol} />
                    <div>
                      <InlineLink to={`/explorer/tokens/${token.id.toLowerCase()}`}>{token.symbol}</InlineLink>
                      <ThemedText.LabelSmall>{token.name}</ThemedText.LabelSmall>
                    </div>
                  </PairCell>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(token.volumeUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(token.totalValueLockedUSD), type: NumberType.FiatTokenStats })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(token.poolCount), type: NumberType.WholeNumber })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>
                    {formatNumber({ input: parseAmount(token.txCount), type: NumberType.WholeNumber })}
                  </ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ExternalLink href={getExplorerLink(FENINE_CHAIN_ID, token.id, ExplorerDataType.TOKEN)}>
                    <ThemedText.Link>
                      {shortenAddress(token.id)}
                      <ArrowUpRight size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />
                    </ThemedText.Link>
                  </ExternalLink>
                </BodyCell>
              </tr>
            ))}
          </tbody>
        </StyledTable>
      </TableScroll>
      <TablePagination
        currentPage={currentPage}
        hasNextPage={tokens.length >= pageSize}
        itemCount={tokens.length}
        pageSize={pageSize}
        onPrevious={onPreviousPage}
        onNext={onNextPage}
      />
    </ContentCard>
  )
}

function PoolDetailView({ poolAddress }: { poolAddress: string }) {
  const poolId = poolAddress.toLowerCase()
  const { formatNumber } = useFormatter()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [poolId])

  const { data, loading } = useQuery<PoolDetailQueryResult>(EXPLORER_POOL_DETAIL_QUERY, {
    variables: { poolId, first: DETAIL_POOL_PAGE_SIZE, skip: (page - 1) * DETAIL_POOL_PAGE_SIZE },
    skip: !poolAddress,
    pollInterval: 30_000,
    fetchPolicy: 'no-cache',
  })

  if (loading && !data?.pool) {
    return <ExplorerTableMessage message="Loading pool details..." />
  }

  const pool = data?.pool
  if (!pool) {
    return <ExplorerTableMessage message="Pool not found in the Fenine subgraph." />
  }

  return (
    <>
      <Header>
        <Breadcrumbs>
          <InlineLink to="/explorer">Explorer</InlineLink>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <InlineLink to="/explorer/pairs">Pairs</InlineLink>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <ThemedText.BodySecondary>
            {pool.token0.symbol} / {pool.token1.symbol}
          </ThemedText.BodySecondary>
        </Breadcrumbs>
        <DetailHero>
          <DetailTitle>
            <PairLogos token0={pool.token0} token1={pool.token1} />
            <div>
              <ThemedText.Hero>
                {pool.token0.symbol} / {pool.token1.symbol}
              </ThemedText.Hero>
              <ThemedText.BodySecondary>
                {pool.token0.name} and {pool.token1.name}
              </ThemedText.BodySecondary>
            </div>
          </DetailTitle>
          <Badge>{formatFeeTier(pool.feeTier)}</Badge>
        </DetailHero>
      </Header>

      <StatsGrid>
        <InfoStatCard
          label="Current price"
          value={<>{formatNumber({ input: parseAmount(pool.token1Price), type: NumberType.SwapPrice })}</>}
          hint={`${pool.token1.symbol} per ${pool.token0.symbol}`}
        />
        <InfoStatCard
          label="TVL"
          value={formatNumber({ input: parseAmount(pool.totalValueLockedUSD), type: NumberType.FiatTokenStats })}
          hint="Liquidity tracked by the subgraph"
        />
        <InfoStatCard
          label="Volume"
          value={formatNumber({ input: parseAmount(pool.volumeUSD), type: NumberType.FiatTokenStats })}
          hint="All-time volume"
        />
        <InfoStatCard
          label="Transactions"
          value={formatNumber({ input: parseAmount(pool.txCount), type: NumberType.WholeNumber })}
          hint={`Tick ${pool.tick ?? '-'}`}
        />
      </StatsGrid>

      <ContentCard style={{ marginBottom: 20 }}>
        <TableScroll>
          <StyledTable>
            <thead>
              <tr>
                <HeadCell>Pool</HeadCell>
                <HeadCell>Created</HeadCell>
                <HeadCell>Explorer</HeadCell>
              </tr>
            </thead>
            <tbody>
              <tr>
                <BodyCell>
                  <ThemedText.BodyPrimary>{shortenAddress(pool.id)}</ThemedText.BodyPrimary>
                </BodyCell>
                <BodyCell>
                  <ThemedText.BodyPrimary>{formatTimestamp(pool.createdAtTimestamp ?? '0')}</ThemedText.BodyPrimary>
                  <ThemedText.LabelSmall>Block #{pool.createdAtBlockNumber ?? '-'}</ThemedText.LabelSmall>
                </BodyCell>
                <BodyCell>
                  <ExternalLink href={getExplorerLink(FENINE_CHAIN_ID, pool.id, ExplorerDataType.ADDRESS)}>
                    <ThemedText.Link>
                      View on explorer
                      <ArrowUpRight size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />
                    </ThemedText.Link>
                  </ExternalLink>
                </BodyCell>
              </tr>
            </tbody>
          </StyledTable>
        </TableScroll>
      </ContentCard>

      <Header style={{ marginBottom: 16 }}>
        <ThemedText.HeadlineSmall>Recent swaps</ThemedText.HeadlineSmall>
        <ThemedText.BodySecondary>Latest swap activity for this pool.</ThemedText.BodySecondary>
      </Header>
      <ActivityTable
        swaps={data?.swaps ?? []}
        currentPage={page}
        pageSize={DETAIL_POOL_PAGE_SIZE}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onNextPage={() => {
          if ((data?.swaps?.length ?? 0) >= DETAIL_POOL_PAGE_SIZE) {
            setPage((value) => value + 1)
          }
        }}
      />
    </>
  )
}

function TokenDetailView({ tokenAddress }: { tokenAddress: string }) {
  const tokenId = tokenAddress.toLowerCase()
  const { formatNumber } = useFormatter()
  const [poolPage, setPoolPage] = useState(1)
  const [swapPage, setSwapPage] = useState(1)

  useEffect(() => {
    setPoolPage(1)
    setSwapPage(1)
  }, [tokenId])

  const { data, loading } = useQuery<TokenDetailQueryResult>(EXPLORER_TOKEN_DETAIL_QUERY, {
    variables: {
      tokenId,
      firstPools: DETAIL_TOKEN_POOL_PAGE_SIZE,
      skipPools: (poolPage - 1) * DETAIL_TOKEN_POOL_PAGE_SIZE,
      firstSwaps: DETAIL_TOKEN_SWAP_PAGE_SIZE,
      skipSwaps: (swapPage - 1) * DETAIL_TOKEN_SWAP_PAGE_SIZE,
    },
    skip: !tokenAddress,
    pollInterval: 30_000,
    fetchPolicy: 'no-cache',
  })

  if (loading && !data?.token) {
    return <ExplorerTableMessage message="Loading token details..." />
  }

  const token = data?.token
  if (!token) {
    return <ExplorerTableMessage message="Token not found in the Fenine subgraph." />
  }

  const relatedPools = dedupePools([...(data?.token0Pools ?? []), ...(data?.token1Pools ?? [])]).sort(
    (a, b) => parseAmount(b.totalValueLockedUSD) - parseAmount(a.totalValueLockedUSD)
  )
  const relatedSwaps = dedupeSwaps([...(data?.token0Swaps ?? []), ...(data?.token1Swaps ?? [])])

  return (
    <>
      <Header>
        <Breadcrumbs>
          <InlineLink to="/explorer">Explorer</InlineLink>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <InlineLink to="/explorer/tokens">Tokens</InlineLink>
          <BreadcrumbSeparator>/</BreadcrumbSeparator>
          <ThemedText.BodySecondary>{token.symbol}</ThemedText.BodySecondary>
        </Breadcrumbs>
        <DetailHero>
          <DetailTitle>
            <AssetLogo chainId={FENINE_CHAIN_ID} address={token.id} symbol={token.symbol} size="40px" />
            <div>
              <ThemedText.Hero>{token.symbol}</ThemedText.Hero>
              <ThemedText.BodySecondary>{token.name}</ThemedText.BodySecondary>
            </div>
          </DetailTitle>
          <ExternalLink href={getExplorerLink(FENINE_CHAIN_ID, token.id, ExplorerDataType.TOKEN)}>
            <ThemedText.Link>
              View on explorer
              <ArrowUpRight size={14} style={{ marginLeft: 6, verticalAlign: 'text-bottom' }} />
            </ThemedText.Link>
          </ExternalLink>
        </DetailHero>
      </Header>

      <StatsGrid>
        <InfoStatCard
          label="Volume"
          value={formatNumber({ input: parseAmount(token.volumeUSD), type: NumberType.FiatTokenStats })}
          hint="All-time traded volume"
        />
        <InfoStatCard
          label="TVL"
          value={formatNumber({ input: parseAmount(token.totalValueLockedUSD), type: NumberType.FiatTokenStats })}
          hint="Liquidity across pools"
        />
        <InfoStatCard
          label="Pools"
          value={formatNumber({ input: parseAmount(token.poolCount), type: NumberType.WholeNumber })}
          hint={shortenAddress(token.id)}
        />
        <InfoStatCard
          label="Transactions"
          value={formatNumber({ input: parseAmount(token.txCount), type: NumberType.WholeNumber })}
          hint={
            token.totalSupply
              ? `Supply ${formatNumber({ input: parseAmount(token.totalSupply), type: NumberType.TokenNonTx })}`
              : '-'
          }
        />
      </StatsGrid>

      <Header style={{ marginBottom: 16 }}>
        <ThemedText.HeadlineSmall>Top related pools</ThemedText.HeadlineSmall>
        <ThemedText.BodySecondary>Pools with the deepest liquidity for this token.</ThemedText.BodySecondary>
      </Header>
      <PairsTable
        pools={relatedPools}
        currentPage={poolPage}
        pageSize={DETAIL_TOKEN_POOL_PAGE_SIZE}
        onPreviousPage={() => setPoolPage((value) => Math.max(1, value - 1))}
        onNextPage={() => {
          if (relatedPools.length >= DETAIL_TOKEN_POOL_PAGE_SIZE) {
            setPoolPage((value) => value + 1)
          }
        }}
      />

      <Header style={{ marginTop: 24, marginBottom: 16 }}>
        <ThemedText.HeadlineSmall>Recent swaps</ThemedText.HeadlineSmall>
        <ThemedText.BodySecondary>Latest swaps involving this token across Fenswap pools.</ThemedText.BodySecondary>
      </Header>
      <ActivityTable
        swaps={relatedSwaps}
        currentPage={swapPage}
        pageSize={DETAIL_TOKEN_SWAP_PAGE_SIZE}
        onPreviousPage={() => setSwapPage((value) => Math.max(1, value - 1))}
        onNextPage={() => {
          if (relatedSwaps.length >= DETAIL_TOKEN_SWAP_PAGE_SIZE) {
            setSwapPage((value) => value + 1)
          }
        }}
      />
    </>
  )
}

export default function ExplorerPage() {
  const navigate = useNavigate()
  const { account } = useWeb3React()
  const {
    tab: rawTab,
    walletAddress,
    poolAddress,
    tokenAddress,
  } = useParams<{
    tab?: string
    walletAddress?: string
    poolAddress?: string
    tokenAddress?: string
  }>()
  const [walletInput, setWalletInput] = useState(walletAddress ?? account ?? '')
  const [activityPage, setActivityPage] = useState(1)
  const [pairsPage, setPairsPage] = useState(1)
  const [tokensPage, setTokensPage] = useState(1)
  const [walletPage, setWalletPage] = useState(1)
  const [volumeRange, setVolumeRange] = useState<VolumeRange>(VolumeRange.D1)
  const { formatNumber } = useFormatter()

  const activeTab = useMemo<ExplorerTab>(() => {
    if (poolAddress) return ExplorerTab.Pairs
    if (tokenAddress) return ExplorerTab.Tokens
    if (walletAddress) return ExplorerTab.Wallet
    if (rawTab === ExplorerTab.Pairs) return ExplorerTab.Pairs
    if (rawTab === ExplorerTab.Tokens) return ExplorerTab.Tokens
    return ExplorerTab.Activity
  }, [poolAddress, rawTab, tokenAddress, walletAddress])

  useEffect(() => {
    setActivityPage(1)
    setPairsPage(1)
    setTokensPage(1)
    setWalletPage(1)
  }, [activeTab, walletAddress, poolAddress, tokenAddress])

  const {
    data: activityData,
    loading: activityLoading,
    error: activityError,
  } = useQuery<ActivityQueryResult>(EXPLORER_ACTIVITY_QUERY, {
    variables: { first: DEFAULT_PAGE_SIZE, skip: (activityPage - 1) * DEFAULT_PAGE_SIZE },
    pollInterval: 30_000,
    fetchPolicy: 'no-cache',
  })

  const { data: poolsData, loading: poolsLoading } = useQuery<PoolsQueryResult>(EXPLORER_POOLS_QUERY, {
    variables: { first: DEFAULT_PAGE_SIZE, skip: (pairsPage - 1) * DEFAULT_PAGE_SIZE },
    pollInterval: 60_000,
    fetchPolicy: 'no-cache',
  })

  const summaryTimestampGte = useMemo(
    () => Math.floor(Date.now() / 1000) - getVolumeRangeSeconds(volumeRange),
    [volumeRange]
  )

  const { data: summaryData, loading: summaryLoading } = useQuery<ExplorerSummaryQueryResult>(EXPLORER_SUMMARY_QUERY, {
    variables: {
      firstPools: SUMMARY_POOL_LIMIT,
      firstSwaps: SUMMARY_SWAP_LIMIT,
      timestampGte: summaryTimestampGte,
    },
    pollInterval: 60_000,
    fetchPolicy: 'no-cache',
  })

  const { data: tokensData, loading: tokensLoading } = useQuery<TokensQueryResult>(EXPLORER_TOKENS_QUERY, {
    variables: { first: DEFAULT_PAGE_SIZE, skip: (tokensPage - 1) * DEFAULT_PAGE_SIZE },
    pollInterval: 60_000,
    fetchPolicy: 'no-cache',
  })

  const normalizedWalletAddress = useMemo(() => {
    const parsed = walletAddress ? isAddress(walletAddress) : false
    return parsed ? parsed.toLowerCase() : undefined
  }, [walletAddress])
  const walletQueryEnabled = Boolean(normalizedWalletAddress)
  const { data: walletData, loading: walletLoading } = useQuery<{ swaps: ExplorerSwap[] }>(EXPLORER_WALLET_QUERY, {
    variables: {
      first: DEFAULT_PAGE_SIZE,
      origin: normalizedWalletAddress,
      skip: (walletPage - 1) * DEFAULT_PAGE_SIZE,
    },
    skip: !walletQueryEnabled,
    pollInterval: 30_000,
    fetchPolicy: 'no-cache',
  })

  const recentSwaps = useMemo(() => activityData?.swaps ?? [], [activityData?.swaps])
  const topPools = useMemo(() => poolsData?.pools ?? [], [poolsData?.pools])
  const topTokens = useMemo(() => tokensData?.tokens ?? [], [tokensData?.tokens])
  const walletSwaps = useMemo(() => walletData?.swaps ?? [], [walletData?.swaps])
  const summaryPools = useMemo(() => summaryData?.pools ?? [], [summaryData?.pools])
  const summarySwaps = useMemo(() => summaryData?.swaps ?? [], [summaryData?.swaps])

  const summary = useMemo(() => {
    const recentVolume = summarySwaps.reduce((total, swap) => total + parseAmount(swap.amountUSD), 0)
    const totalTvl = summaryPools.reduce((total, pool) => total + parseAmount(pool.totalValueLockedUSD), 0)
    return {
      recentSwaps: summarySwaps.length,
      recentVolume,
      activePools: summaryPools.length,
      totalTvl,
    }
  }, [summaryPools, summarySwaps])

  const renderContent = () => {
    if (poolAddress) {
      return <PoolDetailView poolAddress={poolAddress} />
    }

    if (tokenAddress) {
      return <TokenDetailView tokenAddress={tokenAddress} />
    }

    if (activityError) {
      return <ExplorerTableMessage message="The Fenine subgraph is not responding right now. Please try again." />
    }

    if (activeTab === ExplorerTab.Pairs) {
      return poolsLoading && !topPools.length ? (
        <ExplorerTableMessage message="Loading ranked pools..." />
      ) : (
        <PairsTable
          pools={topPools}
          currentPage={pairsPage}
          pageSize={DEFAULT_PAGE_SIZE}
          onPreviousPage={() => setPairsPage((value) => Math.max(1, value - 1))}
          onNextPage={() => {
            if (topPools.length >= DEFAULT_PAGE_SIZE) {
              setPairsPage((value) => value + 1)
            }
          }}
        />
      )
    }

    if (activeTab === ExplorerTab.Tokens) {
      return tokensLoading && !topTokens.length ? (
        <ExplorerTableMessage message="Loading ranked tokens..." />
      ) : (
        <TokensTable
          tokens={topTokens}
          currentPage={tokensPage}
          pageSize={DEFAULT_PAGE_SIZE}
          onPreviousPage={() => setTokensPage((value) => Math.max(1, value - 1))}
          onNextPage={() => {
            if (topTokens.length >= DEFAULT_PAGE_SIZE) {
              setTokensPage((value) => value + 1)
            }
          }}
        />
      )
    }

    if (activeTab === ExplorerTab.Wallet) {
      if (!walletQueryEnabled) {
        return <ExplorerTableMessage message="Enter a wallet address to inspect Fenswap activity." />
      }

      return walletLoading && !walletSwaps.length ? (
        <ExplorerTableMessage message="Loading wallet activity..." />
      ) : (
        <ActivityTable
          swaps={walletSwaps}
          currentPage={walletPage}
          pageSize={DEFAULT_PAGE_SIZE}
          onPreviousPage={() => setWalletPage((value) => Math.max(1, value - 1))}
          onNextPage={() => {
            if (walletSwaps.length >= DEFAULT_PAGE_SIZE) {
              setWalletPage((value) => value + 1)
            }
          }}
        />
      )
    }

    return activityLoading && !recentSwaps.length ? (
      <ExplorerTableMessage message="Loading recent activity..." />
    ) : (
      <ActivityTable
        swaps={recentSwaps}
        currentPage={activityPage}
        pageSize={DEFAULT_PAGE_SIZE}
        onPreviousPage={() => setActivityPage((value) => Math.max(1, value - 1))}
        onNextPage={() => {
          if (recentSwaps.length >= DEFAULT_PAGE_SIZE) {
            setActivityPage((value) => value + 1)
          }
        }}
      />
    )
  }

  return (
    <PageWrapper>
      <Header>
        <TitleRow>
          <div>
            <ThemedText.Hero>Explorer</ThemedText.Hero>
            <ThemedText.BodySecondary style={{ marginTop: 8 }}>
              Trace swaps, pools, tokens, and wallet activity directly from the Fenine subgraph.
            </ThemedText.BodySecondary>
          </div>
          <RangeButtonGroup>
            {Object.values(VolumeRange).map((range) => (
              <RangeButton key={range} active={range === volumeRange} onClick={() => setVolumeRange(range)}>
                {getVolumeRangeLabel(range)}
              </RangeButton>
            ))}
          </RangeButtonGroup>
        </TitleRow>
      </Header>

      <TabsRow>
        <TabButton active={activeTab === ExplorerTab.Activity} onClick={() => navigate('/explorer')}>
          Activity
        </TabButton>
        <TabButton active={activeTab === ExplorerTab.Pairs} onClick={() => navigate('/explorer/pairs')}>
          Pairs
        </TabButton>
        <TabButton active={activeTab === ExplorerTab.Tokens} onClick={() => navigate('/explorer/tokens')}>
          Tokens
        </TabButton>
        <TabButton
          active={activeTab === ExplorerTab.Wallet}
          onClick={() =>
            navigate(
              account || walletInput ? `/explorer/address/${(account ?? walletInput).toLowerCase()}` : '/explorer'
            )
          }
        >
          Wallet
        </TabButton>
      </TabsRow>

      <StatsGrid>
        <StatCard>
          <ThemedText.LabelSmall>Swaps ({getVolumeRangeLabel(volumeRange)})</ThemedText.LabelSmall>
          <ThemedText.HeadlineLarge>
            {summaryLoading ? '-' : formatNumber({ input: summary.recentSwaps, type: NumberType.WholeNumber })}
          </ThemedText.HeadlineLarge>
        </StatCard>
        <StatCard>
          <ThemedText.LabelSmall>Volume ({getVolumeRangeLabel(volumeRange)})</ThemedText.LabelSmall>
          <ThemedText.HeadlineLarge>
            {summaryLoading ? '-' : formatUsdCompactEnglish(summary.recentVolume)}
          </ThemedText.HeadlineLarge>
        </StatCard>
        <StatCard>
          <ThemedText.LabelSmall>Tracked pools</ThemedText.LabelSmall>
          <ThemedText.HeadlineLarge>
            {summaryLoading ? '-' : formatNumber({ input: summary.activePools, type: NumberType.WholeNumber })}
          </ThemedText.HeadlineLarge>
        </StatCard>
        <StatCard>
          <ThemedText.LabelSmall>Total TVL</ThemedText.LabelSmall>
          <ThemedText.HeadlineLarge>
            {summaryLoading ? '-' : formatUsdCompactEnglish(summary.totalTvl)}
          </ThemedText.HeadlineLarge>
        </StatCard>
      </StatsGrid>

      <WalletBar
        onSubmit={(event) => {
          event.preventDefault()
          const parsed = isAddress(walletInput.trim())
          if (parsed) {
            navigate(`/explorer/address/${parsed.toLowerCase()}`)
          }
        }}
      >
        <WalletInput
          value={walletInput}
          onChange={(event) => setWalletInput(event.target.value)}
          placeholder="0x... wallet address"
        />
        <PrimaryButton type="submit">View wallet</PrimaryButton>
      </WalletBar>

      {renderContent()}
    </PageWrapper>
  )
}
