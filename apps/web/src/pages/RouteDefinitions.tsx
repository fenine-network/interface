import { t } from '@lingui/macro'
import { useInfoExplorePageEnabled } from 'featureFlags/flags/infoExplore'
import { useInfoPoolPageEnabled } from 'featureFlags/flags/infoPoolPage'
import { lazy, ReactNode, Suspense, useMemo } from 'react'
import { matchPath, Navigate, useLocation } from 'react-router-dom'
import { isBrowserRouterEnabled } from 'utils/env'

// High-traffic pages (index and /swap) should not be lazy-loaded.
import Landing from './Landing'
import Swap from './Swap'

const Explore = lazy(() => import('pages/Explore'))
const ExplorerPage = lazy(() => import('pages/Explorer'))
const AddLiquidityWithTokenRedirects = lazy(() => import('pages/AddLiquidity/redirects'))
const AddLiquidityV2WithTokenRedirects = lazy(() => import('pages/AddLiquidityV2/redirects'))
const RedirectExplore = lazy(() => import('pages/Explore/redirects'))
const MigrateV2 = lazy(() => import('pages/MigrateV2'))
const MigrateV2Pair = lazy(() => import('pages/MigrateV2/MigrateV2Pair'))
const NotFound = lazy(() => import('pages/NotFound'))
const Pool = lazy(() => import('pages/Pool'))
const PositionPage = lazy(() => import('pages/Pool/PositionPage'))
const PoolV2 = lazy(() => import('pages/Pool/v2'))
const PoolDetails = lazy(() => import('pages/PoolDetails'))
const PoolFinder = lazy(() => import('pages/PoolFinder'))
const RemoveLiquidity = lazy(() => import('pages/RemoveLiquidity'))
const RemoveLiquidityV3 = lazy(() => import('pages/RemoveLiquidity/V3'))
const TokenDetails = lazy(() => import('pages/TokenDetails'))

interface RouterConfig {
  browserRouterEnabled?: boolean
  hash?: string
  infoExplorePageEnabled?: boolean
  infoPoolPageEnabled?: boolean
}

/**
 * Convenience hook which organizes the router configuration into a single object.
 */
export function useRouterConfig(): RouterConfig {
  const browserRouterEnabled = isBrowserRouterEnabled()
  const { hash } = useLocation()
  const infoPoolPageEnabled = useInfoPoolPageEnabled()
  const infoExplorePageEnabled = useInfoExplorePageEnabled()
  return useMemo(
    () => ({
      browserRouterEnabled,
      hash,
      infoExplorePageEnabled,
      infoPoolPageEnabled,
    }),
    [browserRouterEnabled, hash, infoExplorePageEnabled, infoPoolPageEnabled]
  )
}

export interface RouteDefinition {
  path: string
  nestedPaths: string[]
  staticTitle: string
  enabled: (args: RouterConfig) => boolean
  getElement: (args: RouterConfig) => ReactNode
}

// Assigns the defaults to the route definition.
function createRouteDefinition(route: Partial<RouteDefinition>): RouteDefinition {
  return {
    getElement: () => null,
    staticTitle: 'Fenswap',
    enabled: () => true,
    path: '/',
    nestedPaths: [],
    // overwrite the defaults
    ...route,
  }
}

export const routes: RouteDefinition[] = [
  createRouteDefinition({
    path: '/',
    staticTitle: t`Trade on Fenswap`,
    getElement: (args) => {
      return args.browserRouterEnabled && args.hash ? <Navigate to={args.hash.replace('#', '')} replace /> : <Landing />
    },
  }),
  createRouteDefinition({
    path: '/explorer',
    staticTitle: t`Explorer on Fenswap`,
    nestedPaths: [':tab', 'address/:walletAddress', 'pairs/:poolAddress', 'tokens/:tokenAddress'],
    getElement: () => <ExplorerPage />,
  }),
  createRouteDefinition({
    path: '/explore',
    staticTitle: t`Explore Tokens on Fenswap`,
    nestedPaths: [':tab', ':chainName'],
    getElement: () => <RedirectExplore />,
    enabled: (args) => Boolean(args.infoExplorePageEnabled),
  }),
  createRouteDefinition({
    path: '/explore',
    staticTitle: t`Explore Tokens on Fenswap`,
    nestedPaths: [':tab/:chainName'],
    getElement: () => <Explore />,
    enabled: (args) => Boolean(args.infoExplorePageEnabled),
  }),
  createRouteDefinition({
    path: '/explore/tokens/:chainName/:tokenAddress',
    staticTitle: t`Buy & Sell on Fenswap`,
    getElement: () => <TokenDetails />,
    enabled: (args) => Boolean(args.infoExplorePageEnabled),
  }),
  createRouteDefinition({
    path: '/tokens',
    staticTitle: t`Explore Tokens on Fenswap`,
    getElement: (args) => {
      return args.infoExplorePageEnabled ? <Navigate to="/explore/tokens" replace /> : <Explore />
    },
  }),
  createRouteDefinition({
    path: '/tokens/:chainName',
    staticTitle: t`Explore Tokens on Fenswap`,
    getElement: (args) => {
      return args.infoExplorePageEnabled ? <RedirectExplore /> : <Explore />
    },
  }),
  createRouteDefinition({
    path: '/tokens/:chainName/:tokenAddress',
    staticTitle: t`Explore Tokens on Fenswap`,
    getElement: (args) => {
      return args.infoExplorePageEnabled ? <RedirectExplore /> : <TokenDetails />
    },
  }),
  createRouteDefinition({
    path: '/explore/pools/:chainName/:poolAddress',
    staticTitle: t`Explore Pools on Fenswap`,
    getElement: () => (
      <Suspense fallback={null}>
        <PoolDetails />
      </Suspense>
    ),
    enabled: (args) => Boolean(args.infoExplorePageEnabled && args.infoPoolPageEnabled),
  }),
  createRouteDefinition({
    path: '/create-proposal',
    staticTitle: t`Fenswap Governance Proposals`,
    getElement: () => <Navigate to="/explorer" replace />,
  }),
  createRouteDefinition({
    path: '/vote/*',
    staticTitle: t`Explorer on Fenswap`,
    getElement: () => <Navigate to="/explorer" replace />,
  }),
  createRouteDefinition({
    path: '/send',
    getElement: () => <Navigate to={{ ...location, pathname: '/swap' }} replace />,
  }),
  createRouteDefinition({
    path: '/swap',
    getElement: () => <Swap />,
    staticTitle: t`Trade on Fenswap`,
  }),
  createRouteDefinition({
    path: '/pool/v2/find',
    getElement: () => <PoolFinder />,
    staticTitle: t`Explore Pools on Fenswap`,
  }),
  createRouteDefinition({ path: '/pool/v2', getElement: () => <PoolV2 />, staticTitle: t`Explore Pools on Fenswap` }),
  createRouteDefinition({ path: '/pool', getElement: () => <Pool /> }),
  createRouteDefinition({
    path: '/pool/:tokenId',
    getElement: () => <PositionPage />,
    staticTitle: t`Manage Positions on Fenswap`,
  }),
  createRouteDefinition({
    path: '/pools/v2/find',
    getElement: () => <PoolFinder />,
    staticTitle: t`Explore Pools on Fenswap`,
  }),
  createRouteDefinition({ path: '/pools/v2', getElement: () => <PoolV2 />, staticTitle: t`Explore Pools on Fenswap` }),
  createRouteDefinition({ path: '/pools', getElement: () => <Pool />, staticTitle: t`Explore Pools on Fenswap` }),
  createRouteDefinition({
    path: '/pools/:tokenId',
    getElement: () => <PositionPage />,
    staticTitle: t`Explore Pools on Fenswap`,
  }),
  createRouteDefinition({
    path: '/add/v2',
    nestedPaths: [':currencyIdA', ':currencyIdA/:currencyIdB'],
    getElement: () => <AddLiquidityV2WithTokenRedirects />,
    staticTitle: t`Add Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/add',
    nestedPaths: [
      ':currencyIdA',
      ':currencyIdA/:currencyIdB',
      ':currencyIdA/:currencyIdB/:feeAmount',
      ':currencyIdA/:currencyIdB/:feeAmount/:tokenId',
    ],
    getElement: () => <AddLiquidityWithTokenRedirects />,
    staticTitle: t`Add Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/remove/v2/:currencyIdA/:currencyIdB',
    getElement: () => <RemoveLiquidity />,
    staticTitle: t`Manage Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/remove/:tokenId',
    getElement: () => <RemoveLiquidityV3 />,
    staticTitle: t`Manage Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/migrate/v2',
    getElement: () => <MigrateV2 />,
    staticTitle: t`Manage Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/migrate/v2/:address',
    getElement: () => <MigrateV2Pair />,
    staticTitle: t`Manage Liquidity on Fenswap`,
  }),
  createRouteDefinition({
    path: '/nfts',
    nestedPaths: [
      'asset/:contractAddress/:tokenId',
      'profile',
      'collection/:contractAddress',
      'collection/:contractAddress/activity',
    ],
    getElement: () => <Navigate to="/explorer" replace />,
    staticTitle: t`Explorer on Fenswap`,
  }),
  createRouteDefinition({ path: '*', getElement: () => <Navigate to="/not-found" replace /> }),
  createRouteDefinition({ path: '/not-found', getElement: () => <NotFound /> }),
]

export const findRouteByPath = (pathname: string) => {
  for (const route of routes) {
    const match = matchPath(route.path, pathname)
    if (match) {
      return route
    }
  }
  return undefined
}
