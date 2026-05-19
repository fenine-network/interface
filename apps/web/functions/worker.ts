import { paths } from '../src/pages/paths'
import {
  handleDefaultRequest,
  handleNftAssetImageRequest,
  handleNftAssetMetadataRequest,
  handleNftCollectionImageRequest,
  handleNftCollectionMetadataRequest,
  handleTokenImageRequest,
  handleTokenMetadataRequest,
} from './handlers'

interface Env {
  ASSETS: Fetcher
}

const FENINE_SUBGRAPH_URL = 'http://34.101.145.221:8000/subgraphs/name/uniswap-v3-fenine'

function matchPath(pathname: string, pattern: RegExp): string[] | undefined {
  const match = pathname.match(pattern)
  return match?.slice(1)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url

    if (pathname === '/api/subgraph') {
      const upstream = await fetch(FENINE_SUBGRAPH_URL, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
      })

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      })
    }

    const tokenImageSegments = matchPath(pathname, /^\/api\/image\/tokens\/([^/]+)\/([^/]+)$/)
    if (tokenImageSegments) {
      return handleTokenImageRequest(request, tokenImageSegments[0], tokenImageSegments[1])
    }

    const nftAssetImageSegments = matchPath(pathname, /^\/api\/image\/nfts\/asset\/([^/]+)\/([^/]+)$/)
    if (nftAssetImageSegments) {
      return handleNftAssetImageRequest(request, nftAssetImageSegments[0], nftAssetImageSegments[1])
    }

    const nftCollectionImageSegments = matchPath(pathname, /^\/api\/image\/nfts\/collection\/([^/]+)$/)
    if (nftCollectionImageSegments) {
      return handleNftCollectionImageRequest(request, nftCollectionImageSegments[0])
    }

    const assetResponse = env.ASSETS.fetch(request)

    const tokenSegments = matchPath(pathname, /^\/tokens\/([^/]+)\/([^/]+)$/)
    if (tokenSegments) {
      return handleTokenMetadataRequest(request, assetResponse, tokenSegments[0], tokenSegments[1])
    }

    const nftAssetSegments = matchPath(pathname, /^\/nfts\/asset\/([^/]+)\/([^/]+)$/)
    if (nftAssetSegments) {
      return handleNftAssetMetadataRequest(request, assetResponse, nftAssetSegments[0], nftAssetSegments[1])
    }

    const nftCollectionSegments = matchPath(pathname, /^\/nfts\/collection\/([^/]+)$/)
    if (nftCollectionSegments) {
      return handleNftCollectionMetadataRequest(request, assetResponse, nftCollectionSegments[0])
    }

    return handleDefaultRequest(request, assetResponse, paths)
  },
} satisfies ExportedHandler<Env>
