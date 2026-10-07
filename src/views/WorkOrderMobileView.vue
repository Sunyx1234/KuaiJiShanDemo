<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { WorkOrder } from '../data/types'
import { acceptMobileWorkOrder, fetchMobileWorkOrder, submitMobileWorkOrder } from '../services/workOrders'

const route = useRoute()
const token = computed(() => String(route.query.token || ''))
const order = ref<WorkOrder | null>(null)
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const cause = ref('')
const measures = ref('')
const files = ref<File[]>([])
const previews = ref<string[]>([])

const deadlineText = computed(() => order.value
  ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(order.value.deadlineAt))
  : '--:--')

const stageTitle = computed(() => {
  if (!order.value) return '告警处置工单'
  if (order.value.status === '待复核') return '处置结果已提交'
  if (order.value.status === '已归档') return '工单已完成归档'
  return order.value.progress === '待接单' ? '待接单' : '工单处理中'
})

async function load() {
  if (!token.value) {
    error.value = '工单链接缺少访问凭证'
    loading.value = false
    return
  }
  try {
    order.value = await fetchMobileWorkOrder(token.value)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '工单加载失败'
  } finally {
    loading.value = false
  }
}

async function acceptOrder() {
  submitting.value = true
  error.value = ''
  try {
    order.value = await acceptMobileWorkOrder(token.value)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '接单失败'
  } finally {
    submitting.value = false
  }
}

function selectPhotos(event: Event) {
  const input = event.target as HTMLInputElement
  const selected = Array.from(input.files || []).slice(0, 3)
  previews.value.forEach(url => URL.revokeObjectURL(url))
  files.value = selected
  previews.value = selected.map(file => URL.createObjectURL(file))
}

function removePhoto(index: number) {
  URL.revokeObjectURL(previews.value[index])
  files.value.splice(index, 1)
  previews.value.splice(index, 1)
}

async function submitResult() {
  if (!files.value.length) {
    error.value = '请至少上传一张处置照片'
    return
  }
  if (!window.confirm('确认现场处置已经完成并提交复核？')) return
  submitting.value = true
  error.value = ''
  try {
    order.value = await submitMobileWorkOrder(token.value, {
      cause: cause.value,
      measures: measures.value,
      photos: files.value,
    })
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '处置结果提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="mobile-order-page">
    <div class="mobile-order-glow" />
    <section v-if="loading" class="mobile-order-state">
      <span class="mobile-spinner" />
      <b>正在加载工单</b>
    </section>
    <section v-else-if="!order" class="mobile-order-state error">
      <i>!</i>
      <b>无法打开工单</b>
      <p>{{ error }}</p>
    </section>
    <div v-else class="mobile-order-shell">
      <header class="mobile-order-header">
        <span>会稽山数字孪生运营中心</span>
        <h1>{{ stageTitle }}</h1>
        <div>
          <em :class="`level-${order.level}`">{{ order.level }}告警</em>
          <b>{{ order.orderNo }}</b>
        </div>
      </header>

      <section class="mobile-alert-card">
        <img :src="order.snapshotUrl || '/assets/huijishan-campus-aerial.jpg'" alt="告警抓拍" />
        <div>
          <h2>{{ order.content }}</h2>
          <p><span>所属区域</span>{{ order.area }}</p>
          <p><span>告警时间</span>{{ order.alertTime }}</p>
          <p><span>完成时限</span>{{ deadlineText }} 前</p>
        </div>
      </section>

      <section v-if="order.progress === '待接单' && order.status === '处理中'" class="mobile-action-card">
        <h3>处置要求</h3>
        <p>{{ order.requirement || '请及时核查并完成现场处置' }}</p>
        <dl>
          <div><dt>责任部门</dt><dd>{{ order.department }}</dd></div>
          <div><dt>责任人</dt><dd>{{ order.assignee }}</dd></div>
        </dl>
        <button class="mobile-primary-button" :disabled="submitting" @click="acceptOrder">
          {{ submitting ? '正在接单…' : '接受工单' }}
        </button>
      </section>

      <form v-else-if="order.status === '处理中'" class="mobile-disposal-form" @submit.prevent="submitResult">
        <div class="mobile-progress-banner">
          <i>✓</i><span><b>已接单</b><small>请上传现场处置照片</small></span>
        </div>
        <label class="mobile-field-title">处置照片 <em>*</em><small>最多 3 张，单张不超过 5 MB</small></label>
        <div class="mobile-photo-grid">
          <button v-for="(preview, index) in previews" :key="preview" type="button" class="mobile-photo-preview" @click="removePhoto(index)">
            <img :src="preview" alt="处置照片预览" /><span>×</span>
          </button>
          <label v-if="files.length < 3" class="mobile-photo-picker">
            <input type="file" accept="image/*" capture="environment" multiple @change="selectPhotos" />
            <b>＋</b><span>拍照上传</span>
          </label>
        </div>
        <label class="mobile-input-field">
          <span>原因说明 <small>选填</small></span>
          <textarea v-model="cause" maxlength="500" placeholder="填写现场异常原因" />
        </label>
        <label class="mobile-input-field">
          <span>处置措施 <small>选填</small></span>
          <textarea v-model="measures" maxlength="500" placeholder="填写采取的处置措施" />
        </label>
        <button class="mobile-primary-button" type="submit" :disabled="submitting">
          {{ submitting ? '正在提交…' : '提交处置结果' }}
        </button>
      </form>

      <section v-else class="mobile-complete-card">
        <i>✓</i>
        <h2>{{ order.status === '已归档' ? '工单已完成归档' : '处置结果已提交' }}</h2>
        <p>{{ order.status === '已归档' ? `归档编号：${order.archivedNo}` : '管理人员复核后，系统将自动完成电子归档。' }}</p>
        <div><span>当前状态</span><b>{{ order.status }}</b></div>
        <div><span>责任人</span><b>{{ order.assignee }}</b></div>
      </section>

      <p v-if="error" class="mobile-order-error">{{ error }}</p>
      <footer>HUIJISHAN · DIGITAL SAFETY WORKFLOW</footer>
    </div>
  </main>
</template>
