# Cloudflare Workers

## Purpose

These handlers run on Cloudflare Workers and use Static Assets to serve the SPA while still injecting server-side meta tags and generating dynamic Open Graph images.

## Functions

There are 2 runtime concerns in this folder:

- Metadata injectors
  - Routes for token pages, NFT asset pages, and NFT collection pages fetch GraphQL data and inject [Open Graph](https://ogp.me/) tags into the SPA shell before returning HTML.
- Dynamic image routes
  - Routes under `api/image` use Vercel's Open Graph tooling to generate share images for token pages, NFT assets, and NFT collections.
- Worker entry
  - `worker.ts` is the long-term Cloudflare entrypoint.
  - It uses the `ASSETS` binding to serve the built CRA bundle, applies SPA fallback via Wrangler Static Assets, and only intercepts routes that need metadata or OG generation.
  - The Worker is prebuilt into `.cloudflare/worker.mjs` before local preview or deploy so Wrangler does not need to rebundle the TypeScript graph.

## Testing

Testing is done with a custom jest environment plus local Wrangler preview for Workers Static Assets:
- Run `yarn start:cloud` to build the app, prebundle the Worker, and preview it through `wrangler dev` on `localhost:3000`
- Run unit tests with `yarn test:cloud`

## Deployment

Deploy through Wrangler after building the SPA bundle:
- `yarn deploy:cloud`

This expects `wrangler.toml` to be the source of truth for the Worker script and Static Assets configuration.

## Miscellaneous
- Caching: In order to speed up webpage requests, repeated GraphQL queries will be saved and pulled using Cloudflare's Cache API.

## Scripts

- `yarn start:cloud` builds the production bundle and runs `wrangler dev` with Static Assets on port `3000`
  - `build/` is served through the `ASSETS` binding
  - `.cloudflare/worker.mjs` is generated from `functions/worker.ts`
  - `not_found_handling = "single-page-application"` keeps client-side routing working
  - `run_worker_first` lets the Worker intercept metadata and image routes before static asset resolution
- `yarn build:cloud:worker` bundles the Cloudflare Worker into a deployable ESM file
- `yarn deploy:cloud` builds the bundle and deploys the Worker plus static assets
- `yarn test:cloud` (NODE_OPTIONS=--experimental-vm-modules yarn jest functions  --watch --config=functions/jest.config.json), script to test cloud functions with jest
  - `NODE_OPTIONS=--experimental-vm-modules`: support for ES Modules and Web Assembly
  - `--config=functions/jest.config.json`: specifying which config file to use

  ## Additional Documents
  - [Open Graph Protocol](https://ogp.me/)
  - [Open Graph Image Generation](https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation)
  - [Cloudflare Workers](https://developers.cloudflare.com/workers/)
  - [HTML Rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/)
  - [Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)
