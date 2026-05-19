/* eslint-disable import/no-unused-modules */
import { handleNftAssetImageRequest } from '../../../../handlers'

export const onRequest: PagesFunction = async ({ params, request }) => {
  try {
    const { index } = params
    const collectionAddress = index[0]?.toString()
    const tokenId = index[1]?.toString()
    return handleNftAssetImageRequest(request, collectionAddress, tokenId)
  } catch (error: any) {
    return new Response(error.message || error.toString(), { status: 500 })
  }
}
