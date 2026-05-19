import { ImageResponse } from '@vercel/og'
import React from 'react'

import { blocklistedCollections } from '../src/nft/utils/blocklist'
import { getColor } from '../src/utils/getColor'
import { MetaTagInjector } from './components/metaTagInjector'
import getAsset from './utils/getAsset'
import getCollection from './utils/getCollection'
import getFont from './utils/getFont'
import getNetworkLogoUrl from './utils/getNetworkLogoURL'
import { getMetadataRequest, getRequest } from './utils/getRequest'
import getToken from './utils/getToken'

export function doesMatchPath(pathname: string, paths: string[]): boolean {
  const regexPaths = paths.map((path) => '^' + path.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*') + '$')
  return regexPaths.some((regex) => new RegExp(regex).test(pathname))
}

const brandBadgeStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  border: '1px solid rgba(250, 247, 227, 0.35)',
  backgroundColor: 'rgba(19, 62, 82, 0.72)',
  color: '#faf7e3',
  padding: '14px 24px',
  fontFamily: 'Inter',
  fontSize: '28px',
  fontWeight: 700,
  letterSpacing: '-0.03em',
} as const

const HTML_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
} as const

const DYNAMIC_IMAGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
  'CDN-Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
} as const

function withHeaders(response: Response, headers: Record<string, string>): Response {
  const nextHeaders = new Headers(response.headers)
  for (const [key, value] of Object.entries(headers)) {
    nextHeaders.set(key, value)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: nextHeaders,
  })
}

export async function handleDefaultRequest(
  request: Request,
  assetResponse: Promise<Response>,
  paths: string[]
): Promise<Response> {
  const requestURL = new URL(request.url)
  const imageUri = requestURL.origin + '/images/1200x630_Rich_Link_Preview_Image.png'
  const data = {
    title: 'Fenswap',
    image: imageUri,
    url: request.url,
    description: 'Swap or provide liquidity on Fenswap',
  }

  try {
    const content = new HTMLRewriter().on('head', new MetaTagInjector(data, request)).transform(await assetResponse).body
    return new Response(content, {
      status: doesMatchPath(requestURL.pathname, paths) || requestURL.pathname.includes('.') ? 200 : 404,
      headers: HTML_CACHE_HEADERS,
    })
  } catch {
    return assetResponse
  }
}

export async function handleTokenMetadataRequest(
  request: Request,
  assetResponse: Promise<Response>,
  networkName?: string,
  tokenAddress?: string
): Promise<Response> {
  if (!tokenAddress) {
    return assetResponse
  }

  try {
    return withHeaders(
      await getMetadataRequest(assetResponse, request, () => getToken(networkName ?? '', tokenAddress, request.url)),
      HTML_CACHE_HEADERS
    )
  } catch {
    return assetResponse
  }
}

export async function handleNftAssetMetadataRequest(
  request: Request,
  assetResponse: Promise<Response>,
  collectionAddress?: string,
  tokenId?: string
): Promise<Response> {
  try {
    return withHeaders(
      await getMetadataRequest(assetResponse, request, () => getAsset(collectionAddress ?? '', tokenId ?? '', request.url)),
      HTML_CACHE_HEADERS
    )
  } catch {
    return assetResponse
  }
}

export async function handleNftCollectionMetadataRequest(
  request: Request,
  assetResponse: Promise<Response>,
  collectionAddress?: string
): Promise<Response> {
  try {
    return withHeaders(
      await getMetadataRequest(assetResponse, request, () => getCollection(collectionAddress ?? '', request.url)),
      HTML_CACHE_HEADERS
    )
  } catch {
    return assetResponse
  }
}

export async function handleTokenImageRequest(
  request: Request,
  networkName: string,
  tokenAddress: string
): Promise<Response> {
  const origin = new URL(request.url).origin
  const cacheUrl = origin + '/tokens/' + networkName + '/' + tokenAddress

  const data = await getRequest(
    cacheUrl,
    () => getToken(networkName, tokenAddress, cacheUrl),
    (value): value is NonNullable<Awaited<ReturnType<typeof getToken>>> => Boolean(value.symbol && value.name)
  )

  if (!data) {
    return new Response('Token not found.', { status: 404 })
  }

  const [fontData, palette] = await Promise.all([getFont(origin), getColor(data.ogImage, true)])
  const networkLogo = getNetworkLogoUrl(networkName.toUpperCase(), origin)

  let words = data.name.split(' ')
  words = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  let name = words.join(' ')
  name = name.trim()

  return withHeaders(
    new ImageResponse(
      (
        <div
          style={{
            backgroundColor: 'black',
            display: 'flex',
            width: '1200px',
            height: '630px',
          }}
        >
          <div
            style={{
              display: 'flex',
              backgroundColor: `rgba(${palette[0]}, ${palette[1]}, ${palette[2]})`,
              alignItems: 'center',
              height: '100%',
              padding: '72px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                width: '100%',
                height: '100%',
                color: 'white',
              }}
            >
              {data.ogImage ? (
                <img src={data.ogImage} width="144px" style={{ borderRadius: '100%' }}>
                  {networkLogo !== '' && (
                    <img
                      src={networkLogo}
                      width="48px"
                      style={{
                        position: 'absolute',
                        right: '2px',
                        bottom: '0px',
                        borderRadius: '100%',
                      }}
                    />
                  )}
                </img>
              ) : (
                <div
                  style={{
                    width: '144px',
                    height: '144px',
                    borderRadius: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Inter',
                      fontSize: '48px',
                      lineHeight: '58px',
                      color: 'white',
                    }}
                  >
                    {data.name.slice(0, 3).toUpperCase()}
                  </div>
                  {networkLogo !== '' && (
                    <img
                      src={networkLogo}
                      width="48px"
                      style={{
                        position: 'absolute',
                        right: '2px',
                        bottom: '0px',
                        borderRadius: '100%',
                      }}
                    />
                  )}
                </div>
              )}
              <div
                style={{
                  fontFamily: 'Inter',
                  fontSize: '72px',
                  lineHeight: '72px',
                  marginLeft: '-5px',
                  marginTop: '24px',
                }}
              >
                {name}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '168px',
                    lineHeight: '133px',
                    marginLeft: '-13px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}
                >
                  {data.symbol}
                </div>
                <div style={brandBadgeStyle}>Fenswap</div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    ) as Response,
    DYNAMIC_IMAGE_CACHE_HEADERS
  )
}

export async function handleNftAssetImageRequest(
  request: Request,
  collectionAddress?: string,
  tokenId?: string
): Promise<Response> {
  if (!collectionAddress || !tokenId) {
    return new Response('Asset not found.', { status: 404 })
  }

  const origin = new URL(request.url).origin
  const cacheUrl = origin + '/nfts/asset/' + collectionAddress + '/' + tokenId

  if (blocklistedCollections.includes(collectionAddress)) {
    return new Response('Collection unsupported.', { status: 404 })
  }

  const data = await getRequest(
    cacheUrl,
    () => getAsset(collectionAddress, tokenId, cacheUrl),
    (value): value is NonNullable<Awaited<ReturnType<typeof getAsset>>> => Boolean(value.ogImage)
  )

  if (!data) {
    return new Response('Asset not found.', { status: 404 })
  }

  const fontData = await getFont(origin)

  return withHeaders(
    new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            width: '1200px',
            height: '630px',
          }}
        >
          <img src={data.ogImage} alt={data.title} width="1200px" />
          <div
            style={{
              position: 'absolute',
              bottom: '72px',
              right: '72px',
              display: 'flex',
              gap: '24px',
            }}
          >
            <div style={brandBadgeStyle}>Fenswap</div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    ) as Response,
    DYNAMIC_IMAGE_CACHE_HEADERS
  )
}

export async function handleNftCollectionImageRequest(request: Request, collectionAddress?: string): Promise<Response> {
  if (!collectionAddress) {
    return new Response('Collection not found.', { status: 404 })
  }

  const origin = new URL(request.url).origin
  const cacheUrl = origin + '/nfts/collection/' + collectionAddress

  if (blocklistedCollections.includes(collectionAddress)) {
    return new Response('Collection unsupported.', { status: 404 })
  }

  const data = await getRequest(
    cacheUrl,
    () => getCollection(collectionAddress, cacheUrl),
    (value): value is NonNullable<Awaited<ReturnType<typeof getCollection>>> =>
      Boolean(value.ogImage && value.name && value.isVerified)
  )

  if (!data) {
    return new Response('Collection not found.', { status: 404 })
  }

  const [fontData, palette] = await Promise.all([getFont(origin), getColor(data.ogImage)])
  const words = data.name.split(' ')

  return withHeaders(
    new ImageResponse(
      (
        <div
          style={{
            backgroundColor: 'black',
            display: 'flex',
            width: '1200px',
            height: '630px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: `rgba(${palette[0]}, ${palette[1]}, ${palette[2]}, 0.75)`,
              padding: '72px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: '48px',
                width: '100%',
              }}
            >
              <img
                src={data.ogImage}
                alt={data.name}
                width="500px"
                height="500px"
                style={{
                  borderRadius: '60px',
                  objectFit: 'cover',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '32px',
                  width: '45%',
                }}
              >
                <div
                  style={{
                    gap: '12px',
                    fontSize: '72px',
                    fontFamily: 'Inter',
                    color: 'white',
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  {words.map((word, index) => (
                    <text key={word + index}>{word}</text>
                  ))}
                  {data.isVerified && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(250, 247, 227, 0.16)',
                        color: '#faf7e3',
                        fontSize: '24px',
                        padding: '10px 18px',
                      }}
                    >
                      Verified
                    </div>
                  )}
                </div>
                <div style={brandBadgeStyle}>Fenswap</div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    ) as Response,
    DYNAMIC_IMAGE_CACHE_HEADERS
  )
}
