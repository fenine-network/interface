/* eslint-disable import/no-unused-modules */
import { handleNftCollectionMetadataRequest } from '../../handlers'

export const onRequest: PagesFunction = async ({ params, request, next }) => {
  const res = next()
  try {
    const { index } = params
    const collectionAddress = index?.toString()
    return handleNftCollectionMetadataRequest(request, res, collectionAddress)
  } catch {
    return res
  }
}
