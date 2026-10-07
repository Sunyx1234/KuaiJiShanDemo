import { randomUUID } from 'node:crypto'
import { getStore as getNetlifyStore } from '@netlify/blobs'

let getStore = getNetlifyStore
let writePhoto = (store, key, file, metadata) => store.set(key, file, { metadata })
let readPhoto = (store, key) => store.getWithMetadata(key, { type: 'blob' })

export function configureWorkOrderStorage(adapter) {
  getStore = adapter.getStore
  writePhoto = adapter.writePhoto
  readPhoto = adapter.readPhoto
}

const orderStore = () => getStore({ name: 'huijishan-work-orders', consistency: 'strong' })
const photoStore = () => getStore({ name: 'huijishan-work-order-photos', consistency: 'strong' })
const ORDER_PREFIX = 'order:'
const PHOTO_LIMIT = 3
const PHOTO_SIZE_LIMIT = 5 * 1024 * 1024

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  })
}

function nowText() {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date()).replaceAll('/', '-')
}

function addMinutes(minutes) {
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

function publicOrder(order, origin) {
  const { mobileToken: _mobileToken, ...safe } = order
  return {
    ...safe,
    photos: (safe.photos || []).map(photo => ({
      ...photo,
      url: `${origin}/api/work-orders?photo=${encodeURIComponent(photo.key)}`,
    })),
  }
}

async function listOrders(origin) {
  const store = orderStore()
  const { blobs } = await store.list({ prefix: ORDER_PREFIX })
  const orders = await Promise.all(blobs.map(blob => store.get(blob.key, { type: 'json' })))
  return orders.filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(order => publicOrder(order, origin))
}

async function findByToken(token) {
  const store = orderStore()
  const { blobs } = await store.list({ prefix: ORDER_PREFIX })
  for (const blob of blobs) {
    const order = await store.get(blob.key, { type: 'json' })
    if (order?.mobileToken === token) return order
  }
  return null
}

function requireAdminPin(pin) {
  const expected = process.env.WORK_ORDER_ADMIN_PIN
  if (!expected) throw Object.assign(new Error('尚未配置工单管理口令'), { status: 503 })
  if (!pin || pin !== expected) throw Object.assign(new Error('管理口令不正确'), { status: 401 })
}

async function getTenantToken() {
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET
  if (!appId || !appSecret) throw new Error('飞书应用凭证尚未配置')
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })
  const body = await response.json()
  if (!response.ok || body.code !== 0 || !body.tenant_access_token) {
    throw new Error(body.msg || '无法获取飞书 tenant_access_token')
  }
  return body.tenant_access_token
}

function buildFeishuCard(order, mobileUrl, options = {}) {
  const template = options.template || (order.level === '严重' ? 'red' : order.level === '关注' ? 'orange' : 'blue')
  const content = options.content || `**${order.content}**\n区域：${order.area}\n告警时间：${order.alertTime}\n处置时限：${order.deadlineMinutes} 分钟\n派单要求：${order.requirement || '请及时核查并完成现场处置'}`
  return {
    config: { wide_screen_mode: true },
    header: {
      template,
      title: { tag: 'plain_text', content: options.title || `${order.level}告警处置工单` },
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content,
        },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [{
          tag: 'button',
          type: 'primary',
          text: { tag: 'plain_text', content: options.buttonText || '查看并接单' },
          url: mobileUrl,
        }],
      },
    ],
  }
}

async function sendFeishuOrder(order, mobileUrl, cardOptions) {
  const receiveId = process.env.FEISHU_RECEIVER_ID
  const receiveIdType = process.env.FEISHU_RECEIVER_ID_TYPE || 'open_id'
  if (!receiveId) throw new Error('飞书收件人尚未配置')
  const tenantToken = await getTenantToken()
  const response = await fetch(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(receiveIdType)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tenantToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        receive_id: receiveId,
        msg_type: 'interactive',
        content: JSON.stringify(buildFeishuCard(order, mobileUrl, cardOptions)),
      }),
    },
  )
  const body = await response.json()
  if (!response.ok || body.code !== 0) throw new Error(body.msg || '飞书消息发送失败')
  return body.data?.message_id || ''
}

async function handleDispatch(payload, origin) {
  requireAdminPin(payload.adminPin)
  const alert = payload.alert
  if (!alert?.id || !alert.orderNo) return json({ message: '告警信息不完整' }, 400)
  const deadlineMinutes = Number(payload.deadlineMinutes)
  if (![15, 30, 60, 120].includes(deadlineMinutes)) return json({ message: '处置时限无效' }, 400)

  const store = orderStore()
  const existing = await store.get(`${ORDER_PREFIX}${alert.id}`, { type: 'json' })
  if (existing) return json({ message: '该告警已经生成工单' }, 409)

  const timestamp = new Date().toISOString()
  const displayTime = nowText()
  const mobileToken = randomUUID().replaceAll('-', '')
  const mobileUrl = `${process.env.PUBLIC_SITE_URL || origin}/#/work-order?token=${mobileToken}`
  const order = {
    id: `wo-${alert.id}`,
    orderNo: alert.orderNo,
    alertId: alert.id,
    cameraId: alert.cameraId,
    algorithm: alert.algorithm,
    level: alert.level,
    content: alert.content,
    area: alert.area,
    alertTime: alert.time,
    snapshotUrl: alert.snapshotUrl,
    status: '处理中',
    progress: '待接单',
    department: process.env.FEISHU_RECEIVER_DEPARTMENT || '安全生产部',
    assignee: process.env.FEISHU_RECEIVER_NAME || '现场责任人',
    requirement: String(payload.requirement || '').slice(0, 200),
    deadlineMinutes,
    deadlineAt: addMinutes(deadlineMinutes),
    photos: [],
    notifications: [{ channel: '飞书', status: '待发送', time: displayTime }],
    timeline: [
      { id: randomUUID(), time: displayTime, title: '告警确认为有效', detail: '已生成处置工单', actor: '值班管理员' },
      { id: randomUUID(), time: displayTime, title: '工单已派发', detail: `责任人：${process.env.FEISHU_RECEIVER_NAME || '现场责任人'}`, actor: '值班管理员' },
    ],
    mobileToken,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await store.setJSON(`${ORDER_PREFIX}${alert.id}`, order)

  try {
    order.feishuMessageId = await sendFeishuOrder(order, mobileUrl)
    order.notifications[0] = { channel: '飞书', status: '发送成功', time: nowText(), detail: '工单卡片已送达飞书' }
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '飞书消息发送成功', detail: '责任人可通过卡片进入移动端', actor: '消息中心' })
  } catch (error) {
    order.notifications[0] = { channel: '飞书', status: '发送失败', time: nowText(), detail: error.message }
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '飞书消息发送失败', detail: error.message, actor: '消息中心' })
  }
  order.updatedAt = new Date().toISOString()
  await store.setJSON(`${ORDER_PREFIX}${alert.id}`, order)
  return json({ order: publicOrder(order, origin), mobileUrl }, 201)
}

async function handleAccept(payload, origin) {
  const order = await findByToken(payload.token)
  if (!order) return json({ message: '工单链接无效或已失效' }, 404)
  if (order.status !== '处理中') return json({ message: '当前工单不能接单' }, 409)
  if (order.progress === '待接单') {
    order.progress = '已接单'
    order.acceptedAt = new Date().toISOString()
    order.updatedAt = order.acceptedAt
    order.timeline.push({ id: randomUUID(), time: nowText(), title: `${order.assignee}已接单`, detail: '现场处置计时开始', actor: order.assignee })
    await orderStore().setJSON(`${ORDER_PREFIX}${order.alertId}`, order)
  }
  return json({ order: publicOrder(order, origin) })
}

async function handleSubmit(request, form, origin) {
  const order = await findByToken(String(form.get('token') || ''))
  if (!order) return json({ message: '工单链接无效或已失效' }, 404)
  if (order.status !== '处理中' || order.progress !== '已接单') return json({ message: '当前工单不能提交处置结果' }, 409)
  const files = form.getAll('photos').filter(value => value instanceof File && value.size > 0)
  if (!files.length) return json({ message: '请至少上传一张处置照片' }, 400)
  if (files.length > PHOTO_LIMIT) return json({ message: `最多上传 ${PHOTO_LIMIT} 张处置照片` }, 400)
  if (files.some(file => !file.type.startsWith('image/') || file.size > PHOTO_SIZE_LIMIT)) {
    return json({ message: '仅支持单张不超过 5 MB 的图片' }, 400)
  }

  const photos = []
  for (const file of files) {
    const key = `${order.id}/${randomUUID()}`
    await writePhoto(photoStore(), key, file, { contentType: file.type, name: file.name, orderId: order.id })
    photos.push({ key, name: file.name })
  }
  order.photos = [...(order.photos || []), ...photos]
  order.cause = String(form.get('cause') || '').slice(0, 500)
  order.measures = String(form.get('measures') || '').slice(0, 500)
  order.progress = '已处置'
  order.status = '待复核'
  order.submittedAt = new Date().toISOString()
  order.updatedAt = order.submittedAt
  order.timeline.push({ id: randomUUID(), time: nowText(), title: `${order.assignee}已提交处置结果`, detail: `上传处置照片 ${files.length} 张`, actor: order.assignee })
  await orderStore().setJSON(`${ORDER_PREFIX}${order.alertId}`, order)
  return json({ order: publicOrder(order, origin) })
}

async function handleReview(payload, origin) {
  requireAdminPin(payload.adminPin)
  const key = String(payload.orderId || '').replace(/^wo-/, '')
  const order = await orderStore().get(`${ORDER_PREFIX}${key}`, { type: 'json' })
  if (!order || order.status !== '待复核') return json({ message: '当前工单不能复核' }, 409)
  if (payload.decision === 'approve') {
    order.status = '已归档'
    order.archivedNo = `ARC-${Date.now().toString().slice(-10)}`
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '复核通过并自动归档', detail: `归档编号：${order.archivedNo}`, actor: '值班管理员' })
  } else if (payload.decision === 'reject') {
    if (!String(payload.comment || '').trim()) return json({ message: '请填写退回原因' }, 400)
    order.status = '处理中'
    order.progress = '已接单'
    order.reviewComment = String(payload.comment).slice(0, 300)
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '退回补充处置', detail: order.reviewComment, actor: '值班管理员' })
    const mobileUrl = `${process.env.PUBLIC_SITE_URL || origin}/#/work-order?token=${order.mobileToken}`
    try {
      order.feishuMessageId = await sendFeishuOrder(order, mobileUrl, {
        template: 'orange',
        title: '工单复核退回',
        content: `**${order.content}**\n工单编号：${order.orderNo}\n退回原因：${order.reviewComment}\n请补充现场处置并重新上传照片。`,
        buttonText: '返回工单补充处置',
      })
      order.notifications[0] = { channel: '飞书', status: '发送成功', time: nowText(), detail: '复核退回通知已送达飞书' }
      order.timeline.push({ id: randomUUID(), time: nowText(), title: '复核退回通知发送成功', detail: '责任人可通过飞书卡片继续处置', actor: '消息中心' })
    } catch (error) {
      order.notifications[0] = { channel: '飞书', status: '发送失败', time: nowText(), detail: error.message }
      order.timeline.push({ id: randomUUID(), time: nowText(), title: '复核退回通知发送失败', detail: error.message, actor: '消息中心' })
    }
  } else {
    return json({ message: '复核操作无效' }, 400)
  }
  order.updatedAt = new Date().toISOString()
  await orderStore().setJSON(`${ORDER_PREFIX}${order.alertId}`, order)
  return json({ order: publicOrder(order, origin) })
}

async function handleRetryNotification(payload, origin) {
  requireAdminPin(payload.adminPin)
  const key = String(payload.orderId || '').replace(/^wo-/, '')
  const order = await orderStore().get(`${ORDER_PREFIX}${key}`, { type: 'json' })
  if (!order) return json({ message: '未找到关联工单' }, 404)
  const deadlineMinutes = Number(payload.deadlineMinutes)
  if (![15, 30, 60, 120].includes(deadlineMinutes)) return json({ message: '处置时限无效' }, 400)
  order.deadlineMinutes = deadlineMinutes
  order.deadlineAt = addMinutes(deadlineMinutes)
  order.requirement = String(payload.requirement || '').slice(0, 200)
  order.department = process.env.FEISHU_RECEIVER_DEPARTMENT || order.department || '安全生产部'
  order.assignee = process.env.FEISHU_RECEIVER_NAME || order.assignee || '现场责任人'
  const mobileUrl = `${process.env.PUBLIC_SITE_URL || origin}/#/work-order?token=${order.mobileToken}`
  try {
    order.feishuMessageId = await sendFeishuOrder(order, mobileUrl)
    order.notifications[0] = { channel: '飞书', status: '发送成功', time: nowText(), detail: '工单卡片已送达飞书' }
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '工单已重新派发', detail: `责任人：${order.assignee}，时限：${deadlineMinutes} 分钟`, actor: '值班管理员' })
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '飞书消息重试成功', detail: '工单卡片已重新发送给责任人', actor: '消息中心' })
  } catch (error) {
    order.notifications[0] = { channel: '飞书', status: '发送失败', time: nowText(), detail: error.message }
    order.timeline.push({ id: randomUUID(), time: nowText(), title: '飞书消息重试失败', detail: error.message, actor: '消息中心' })
  }
  order.updatedAt = new Date().toISOString()
  await orderStore().setJSON(`${ORDER_PREFIX}${order.alertId}`, order)
  return json({ order: publicOrder(order, origin), mobileUrl })
}

export default async (request) => {
  const url = new URL(request.url)
  const origin = `${url.protocol}//${url.host}`
  try {
    if (request.method === 'GET' && url.searchParams.has('config')) {
      return json({
        assignee: process.env.FEISHU_RECEIVER_NAME || '现场责任人',
        department: process.env.FEISHU_RECEIVER_DEPARTMENT || '安全生产部',
        feishuConfigured: Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET && process.env.FEISHU_RECEIVER_ID),
        smsConfigured: Boolean(process.env.SMS_PROVIDER_CONFIGURED),
      })
    }
    if (request.method === 'GET' && url.searchParams.has('photo')) {
      const key = url.searchParams.get('photo')
      const result = await readPhoto(photoStore(), key)
      if (!result) return new Response('Not found', { status: 404 })
      return new Response(result.data, {
        headers: {
          'Content-Type': result.metadata?.contentType || 'image/jpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    }
    if (request.method === 'GET' && url.searchParams.has('token')) {
      const order = await findByToken(url.searchParams.get('token'))
      return order ? json({ order: publicOrder(order, origin) }) : json({ message: '工单链接无效或已失效' }, 404)
    }
    if (request.method === 'GET') return json({ orders: await listOrders(origin) })
    if (request.method !== 'POST') return json({ message: 'Method not allowed' }, 405)

    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      if (form.get('action') !== 'submit') return json({ message: '操作无效' }, 400)
      return await handleSubmit(request, form, origin)
    }
    const payload = await request.json()
    if (payload.action === 'dispatch') return await handleDispatch(payload, origin)
    if (payload.action === 'accept') return await handleAccept(payload, origin)
    if (payload.action === 'review') return await handleReview(payload, origin)
    if (payload.action === 'retry-notification') return await handleRetryNotification(payload, origin)
    return json({ message: '操作无效' }, 400)
  } catch (error) {
    console.error('Work order function failed.', error)
    return json({ message: error.message || '工单服务异常' }, error.status || 500)
  }
}
