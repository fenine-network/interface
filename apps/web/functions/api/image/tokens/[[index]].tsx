/* eslint-disable import/no-unused-modules */
import { handleTokenImageRequest } from '../../../handlers'

export const onRequest: PagesFunction = async ({ params, request }) => {
  try {
    const { index } = params
    const networkName = String(index[0])
    const tokenAddress = String(index[1])
    return handleTokenImageRequest(request, networkName, tokenAddress)
  } catch (error: any) {
    return new Response(error.message || error.toString(), { status: 500 })
  }
}
