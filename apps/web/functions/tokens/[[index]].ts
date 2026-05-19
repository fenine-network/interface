/* eslint-disable import/no-unused-modules */
import { handleTokenMetadataRequest } from '../handlers'

export const onRequest: PagesFunction = async ({ params, request, next }) => {
  const res = next()
  try {
    const { index } = params
    const networkName = index[0]?.toString()
    const tokenAddress = index[1]?.toString()
    return handleTokenMetadataRequest(request, res, networkName, tokenAddress)
  } catch {
    return res
  }
}
