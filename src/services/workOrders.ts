import type { AiAlert, WorkOrder, WorkOrderIntegrationConfig } from '../data/types'

const endpoint = '/api/work-orders'
const adminPinKey = 'huijishan-work-order-admin-pin'

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message || '工单服务暂时不可用')
  return body as T
}

export function getSavedAdminPin() {
  return sessionStorage.getItem(adminPinKey) || ''
}

export function saveAdminPin(pin: string) {
  if (pin) sessionStorage.setItem(adminPinKey, pin)
}

export async function fetchWorkOrderConfig() {
  const response = await fetch(`${endpoint}?config=1`, { cache: 'no-store' })
  return parseResponse<WorkOrderIntegrationConfig>(response)
}

export async function fetchWorkOrders() {
  const response = await fetch(endpoint, { cache: 'no-store' })
  const body = await parseResponse<{ orders: WorkOrder[] }>(response)
  return body.orders
}

export async function dispatchWorkOrder(alert: AiAlert, input: {
  adminPin: string
  deadlineMinutes: number
  requirement: string
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'dispatch',
      adminPin: input.adminPin,
      alert,
      deadlineMinutes: input.deadlineMinutes,
      requirement: input.requirement,
    }),
  })
  const body = await parseResponse<{ order: WorkOrder; mobileUrl: string }>(response)
  saveAdminPin(input.adminPin)
  return body
}

export async function reviewWorkOrder(orderId: string, input: {
  adminPin: string
  decision: 'approve' | 'reject'
  comment?: string
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'review', orderId, ...input }),
  })
  const body = await parseResponse<{ order: WorkOrder }>(response)
  saveAdminPin(input.adminPin)
  return body.order
}

export async function retryWorkOrderNotification(orderId: string, input: {
  adminPin: string
  deadlineMinutes: number
  requirement: string
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'retry-notification', orderId, ...input }),
  })
  const body = await parseResponse<{ order: WorkOrder; mobileUrl: string }>(response)
  saveAdminPin(input.adminPin)
  return body
}

export async function fetchMobileWorkOrder(token: string) {
  const response = await fetch(`${endpoint}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
  const body = await parseResponse<{ order: WorkOrder }>(response)
  return body.order
}

export async function acceptMobileWorkOrder(token: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'accept', token }),
  })
  const body = await parseResponse<{ order: WorkOrder }>(response)
  return body.order
}

export async function submitMobileWorkOrder(token: string, input: {
  cause: string
  measures: string
  photos: File[]
}) {
  const form = new FormData()
  form.set('action', 'submit')
  form.set('token', token)
  form.set('cause', input.cause)
  form.set('measures', input.measures)
  input.photos.forEach(photo => form.append('photos', photo))
  const response = await fetch(endpoint, { method: 'POST', body: form })
  const body = await parseResponse<{ order: WorkOrder }>(response)
  return body.order
}
