/* eslint-disable import/no-unused-modules */
import { handleNftCollectionImageRequest } from '../../../../handlers'

export const onRequest: PagesFunction = async ({ params, request }) => {
  try {
    const { index } = params
    const collectionAddress = index?.toString()
    return handleNftCollectionImageRequest(request, collectionAddress)
  } catch (error: any) {
    return new Response(error.message || error.toString(), { status: 500 })
  }
}
