/* eslint-disable import/no-unused-modules */
import { handleNftAssetMetadataRequest } from '../../handlers'

export const onRequest: PagesFunction = async ({ params, request, next }) => {
  const res = next()
  try {
    const { index } = params
    const collectionAddress = index[0]?.toString()
    const tokenId = index[1]?.toString()
    return handleNftAssetMetadataRequest(request, res, collectionAddress, tokenId)
  } catch {
    return res
  }
}
