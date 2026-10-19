<script setup lang="ts">
import { computed } from 'vue'
import { useFactoryStore } from '../stores/factory'
import { operationDevices, operationTasks, type OperationTask } from '../data/equipmentOperations'
const factory = useFactoryStore()
const device = computed(() => operationDevices.find(d => d.id === factory.detail?.item.deviceId))
const task = computed(() => factory.detail?.kind === 'task' ? factory.detail.item as OperationTask : operationTasks.find(t => t.id === (factory.detail?.item as { taskId?: string })?.taskId))
</script>
<template>
  <el-dialog :model-value="!!factory.detail" :title="factory.detail?.kind === 'task' ? '运维任务详情' : '维护记录详情'" class="operation-dialog" modal-class="operation-dialog-overlay" width="380px" @update:model-value="(value: boolean) => { if (!value) factory.detail = null }">
    <div v-if="factory.detail" class="operation-detail">
      <p class="detail-status">{{ factory.detail.item.status }} · {{ factory.detail.item.type }}</p>
      <h3>{{ 'name' in factory.detail.item ? factory.detail.item.name : factory.detail.item.description }}</h3>
      <dl><div><dt>关联设备</dt><dd>{{ device?.name }} · {{ device?.id }}</dd></div><div><dt>所属工序</dt><dd>{{ device?.area }}</dd></div><div><dt>事件时间</dt><dd>{{ 'createdAt' in factory.detail.item ? factory.detail.item.createdAt : factory.detail.item.time }}</dd></div><div v-if="task"><dt>任务编号</dt><dd>{{ task.id }}</dd></div><div v-if="task"><dt>责任人</dt><dd>{{ task.owner }}</dd></div><div><dt>处理状态</dt><dd>{{ task?.status ?? factory.detail.item.status }}</dd></div></dl>
      <p>{{ task?.description ?? factory.detail.item.description }}</p>
      <p v-if="task" class="detail-flow">{{ task.status === '已完成' ? '点检执行 → 结果复核 → 记录归档' : '异常识别 → 工单派发 → 检修执行 → 复核验收 → 记录归档' }}</p>
      <p class="detail-hint">中央场景已切换至关联设备，可关闭详情继续查看。</p>
    </div>
    <template #footer><el-button @click="factory.detail = null">关闭详情</el-button></template>
  </el-dialog>
</template>
<style scoped>
:global(.operation-dialog-overlay .el-overlay-dialog){display:flex;align-items:center;justify-content:center;overflow:hidden}
:global(.operation-dialog){--el-dialog-bg-color:#0b2234;--el-text-color-primary:#d4e6ec;--el-text-color-regular:#a4c0cc;--el-border-color:#356275;margin:0!important;width:380px;max-width:calc(100% - 32px);max-height:calc(100% - 40px);padding:14px;font-size:12px;line-height:1.5;border:1px solid #356275}
:global(.operation-dialog .el-dialog__header){padding:0 24px 9px 0;margin:0;border-bottom:1px solid #31546b}
:global(.operation-dialog .el-dialog__title){font-size:14px;line-height:1.5;font-weight:500}
:global(.operation-dialog .el-dialog__headerbtn){width:28px;height:28px;top:9px;right:9px;font-size:14px}
:global(.operation-dialog .el-dialog__body){padding:10px 0 0;max-height:460px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#376e83 transparent}
:global(.operation-dialog .el-dialog__footer){padding:10px 0 0}
:global(.operation-dialog .el-button){height:28px;padding:6px 12px;font-size:12px;--el-button-bg-color:#123348;--el-button-text-color:#bcd3df;--el-button-border-color:#356275;--el-button-hover-bg-color:#19465f;--el-button-hover-text-color:#d7edf5;--el-button-hover-border-color:#79d8e3}
.operation-detail{color:#bcd3df;font-size:12px;line-height:1.5}.operation-detail h3{font-size:14px;font-weight:500;color:#d7edf5;margin:6px 0 10px}.operation-detail p{margin:8px 0}.detail-status{color:#edbd74;font-size:11px}.operation-detail dl{margin:0}.operation-detail dl>div{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid #31546b}.operation-detail dt{color:#8ca9b8;flex-shrink:0}.operation-detail dd{margin:0;text-align:right;overflow-wrap:anywhere}.detail-flow{padding:8px;background:#15405a66;color:#79d8e3;font-size:11px}.detail-hint{font-size:11px;color:#8ca9b8}
</style>
