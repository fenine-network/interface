const { createProxyMiddleware } = require('http-proxy-middleware')

const SUBGRAPH_TARGET = 'https://subgraph.fene.app'
const SUBGRAPH_PATH = '/subgraphs/name/uniswap-v3-fenine'

module.exports = function setupProxy(app) {
  app.use(
    '/api/subgraph',
    createProxyMiddleware({
      target: SUBGRAPH_TARGET,
      changeOrigin: true,
      secure: true,
      pathRewrite: {
        '^/api/subgraph$': SUBGRAPH_PATH,
      },
    }),
  )
}
