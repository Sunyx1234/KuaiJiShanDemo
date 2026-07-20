import { getStore } from '@edgeone/pages-blob'
import handleWorkOrders, { configureWorkOrderStorage } from '../../netlify/functions/work-orders.mjs'

configureWorkOrderStorage({
  getStore,
  writePhoto: (store, key, file) => store.set(key, file),
  readPhoto: async (store, key) => {
    const data = await store.get(key, { type: 'blob', consistency: 'strong' })
    return data ? { data, metadata: { contentType: 'image/jpeg' } } : null
  },
})

export default function onRequest({ request }) {
  return handleWorkOrders(request)
}
