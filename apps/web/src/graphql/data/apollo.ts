import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client'
import { onError } from '@apollo/client/link/error'
import { HttpLink } from '@apollo/client/link/http'
import { Reference, relayStylePagination } from '@apollo/client/utilities'

const CONFIGURED_GRAPHQL_URL = process.env.REACT_APP_AWS_API_ENDPOINT
if (!CONFIGURED_GRAPHQL_URL) {
  throw new Error('AWS URL MISSING FROM ENVIRONMENT')
}

const HOSTED_FENINE_SUBGRAPH_URL = 'https://subgraph.fene.app/subgraphs/name/uniswap-v3-fenine'

const GRAPHQL_URL = CONFIGURED_GRAPHQL_URL.startsWith('http://')
  ? HOSTED_FENINE_SUBGRAPH_URL
  : CONFIGURED_GRAPHQL_URL

// Silently handle GraphQL errors (schema mismatch with Fenine subgraph)
// so the app doesn't crash when Uniswap-specific queries fail
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      console.debug('[GraphQL error - non-fatal]:', message)
    })
  }
  if (networkError) {
    console.debug('[Network error - non-fatal]:', networkError)
  }
})

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
    Origin: 'https://app.uniswap.org',
  },
})

export const apolloClient = new ApolloClient({
  connectToDevTools: true,
  link: ApolloLink.from([errorLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          nftBalances: relayStylePagination(['ownerAddress', 'filter']),
          nftAssets: relayStylePagination(),
          nftActivity: relayStylePagination(),
          token: {
            read(_, { args, toReference }): Reference | undefined {
              return toReference({
                __typename: 'Token',
                chain: args?.chain,
                address: args?.address,
              })
            },
          },
        },
      },
      Token: {
        keyFields: ['chain', 'address'],
        fields: {
          address: {
            read(address: string | null): string | null {
              return address?.toLowerCase() ?? null
            },
          },
        },
      },
      TokenProject: {
        fields: {
          tokens: {
            merge(existing, incoming) {
              if (!existing) {
                return incoming
              } else if (Array.isArray(existing)) {
                return [...existing, ...incoming]
              } else {
                return [existing, ...incoming]
              }
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'ignore',
    },
    query: {
      errorPolicy: 'ignore',
    },
  },
})
