/* eslint-disable import/no-unused-modules */
import { paths } from '../src/pages/paths'
import { handleDefaultRequest } from './handlers'

export const onRequest: PagesFunction = async ({ request, next }) => handleDefaultRequest(request, next(), paths)
