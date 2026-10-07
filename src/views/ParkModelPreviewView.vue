<script setup lang="ts">
import { ref } from 'vue'
import ParkThreeScene from '../components/ParkThreeScene.vue'

const showReference = ref(true)
const zones = [
  { index: '01', name: '生产厂房', detail: '大跨度厂房 · 连续屋面 · 采光带' },
  { index: '02', name: '前区办公', detail: '深色幕墙 · 光伏屋顶 · 入口连廊' },
  { index: '03', name: '景观庭院', detail: '中央草坪 · 林荫步道 · 运动场地' },
  { index: '04', name: '园区配套', detail: '环形道路 · 停车区域 · 门岗围栏' },
]
</script>

<template>
  <main class="model-preview">
    <header class="preview-header">
      <div class="preview-brand"><strong>CHINT</strong><span>正泰集团</span></div>
      <div class="preview-title"><small>JIAXING · DIGITAL CAMPUS</small><h1>嘉兴园区<span>/</span>三维模型预览</h1></div>
      <div class="preview-state"><i />方案预览<span>待确认</span></div>
      <button class="reference-toggle" :aria-pressed="showReference" @click="showReference = !showReference">{{ showReference ? '收起参考图' : '展开参考图' }}</button>
    </header>

    <div class="preview-workspace" :class="{ 'reference-hidden': !showReference }">
      <section class="model-stage" aria-label="嘉兴园区三维模型预览区域">
        <ParkThreeScene />
        <div class="stage-heading"><i /><span>园区全景</span><small>3D CAMPUS</small></div>
        <div class="stage-corner stage-corner--tl" /><div class="stage-corner stage-corner--tr" />
        <div class="stage-corner stage-corner--bl" /><div class="stage-corner stage-corner--br" />
        <div class="stage-caption"><b>正泰嘉兴园区</b><span>建筑场景方案 · 深蓝科技风格</span></div>
      </section>

      <aside v-if="showReference" class="reference-panel">
        <div class="reference-heading"><span>参考与构成</span><small>REFERENCE</small></div>
        <figure>
          <img src="/assets/jiaxing-park-reference.png" alt="用户提供的正泰园区航拍参考图：前区办公楼、中央草坪与后排厂房" />
          <figcaption><i />园区参考图<span>01 / 01</span></figcaption>
        </figure>
        <div class="reference-section-label">主要场景构成</div>
        <ol class="zone-list">
          <li v-for="zone in zones" :key="zone.index"><em>{{ zone.index }}</em><div><b>{{ zone.name }}</b><span>{{ zone.detail }}</span></div></li>
        </ol>
        <div class="palette-section">
          <span>与原大屏保持一致</span>
          <div class="palette"><i style="--swatch:#081c33" /><i style="--swatch:#18384f" /><i style="--swatch:#4e7690" /><i style="--swatch:#2fadd6" /><i style="--swatch:#21636a" /></div>
          <small>深蓝底色 / 蓝灰建筑 / 青蓝轮廓</small>
        </div>
        <p class="reference-note">根据单张参考图构建的近似模型，建筑尺寸与不可见区域待进一步校准。</p>
      </aside>
    </div>

    <footer class="preview-footer"><span><i />独立模型预览</span><p>确认模型效果后，再接入园区大屏</p><small>CHINT · JIAXING</small></footer>
  </main>
</template>

<style scoped>
.model-preview{height:100dvh;display:flex;flex-direction:column;padding:0 28px;background:radial-gradient(ellipse at 40% 40%,#0b2b48 0,transparent 62%),#020b1b;color:#d5ebff;overflow:hidden}
.preview-header{height:100px;flex-shrink:0;display:flex;align-items:center;gap:28px;border-bottom:1px solid #174669;position:relative}
.preview-header::after{content:'';position:absolute;bottom:-1px;left:180px;width:34%;height:2px;background:linear-gradient(90deg,transparent,#3cb4e6,transparent)}
.preview-brand{display:flex;flex-direction:column;padding-right:28px;border-right:1px solid #204661}
.preview-brand strong{font:italic 900 33px Arial,sans-serif;letter-spacing:2px;color:#effaff}.preview-brand span{font-size:10px;color:#739cb6;letter-spacing:6px;margin-top:5px}
.preview-title small{font:10px Arial,sans-serif;letter-spacing:3px;color:#5598bd}.preview-title h1{font-size:24px;font-weight:500;letter-spacing:2px;margin:7px 0 0}.preview-title h1 span{margin:0 15px;color:#316887;font-weight:300}
.preview-state{margin-left:auto;display:flex;align-items:center;gap:8px;color:#7ebcda;font-size:12px;white-space:nowrap}.preview-state>i,.stage-heading>i,.preview-footer>span>i{width:5px;height:5px;background:#38c7f2;box-shadow:0 0 8px #2bb6eb}.preview-state>span{font-size:10px;color:#56bbde;border:1px solid #215a79;padding:3px 7px;margin-left:2px}
.reference-toggle{border:1px solid #245370;background:#0b2238;color:#9cc7df;font-size:12px;padding:9px 13px;cursor:pointer}.reference-toggle:hover{border-color:#44b7e7;color:#e1f5ff}.reference-toggle:focus-visible{outline:2px solid #63d4ff;outline-offset:3px}
.preview-workspace{display:grid;grid-template-columns:minmax(0,1fr) 302px;gap:20px;flex:1;min-height:0;padding-top:22px}.preview-workspace.reference-hidden{grid-template-columns:minmax(0,1fr)}
.model-stage{min-width:0;min-height:0;position:relative;border:1px solid #173f5f;overflow:hidden;background:#031021}.stage-heading{position:absolute;z-index:2;left:24px;top:23px;display:flex;gap:10px;align-items:center;pointer-events:none}.stage-heading>span{font-size:15px;letter-spacing:2px}.stage-heading>small{font:9px Arial,sans-serif;letter-spacing:2px;color:#4d87a7;margin-left:7px}
.stage-corner{position:absolute;z-index:2;width:15px;height:15px;border-color:#4296bd;border-style:solid;pointer-events:none}.stage-corner--tl{top:0;left:0;border-width:2px 0 0 2px}.stage-corner--tr{top:0;right:0;border-width:2px 2px 0 0}.stage-corner--bl{bottom:0;left:0;border-width:0 0 2px 2px}.stage-corner--br{bottom:0;right:0;border-width:0 2px 2px 0}
.stage-caption{position:absolute;z-index:2;left:24px;bottom:58px;display:flex;flex-direction:column;gap:7px;pointer-events:none;border-left:2px solid #2fa9d8;padding-left:12px}.stage-caption b{font-size:15px;letter-spacing:3px;font-weight:500}.stage-caption span{font-size:10px;color:#6999b4;letter-spacing:1px}
.reference-panel{border:1px solid #173f5f;background:linear-gradient(145deg,#09213a99,#041323);overflow:auto;scrollbar-width:thin;scrollbar-color:#21475f transparent}.reference-heading{height:48px;border-bottom:1px solid #173f5f;display:flex;align-items:center;padding:0 18px;justify-content:space-between}.reference-heading>span{font-size:14px;letter-spacing:2px}.reference-heading>small{font:9px Arial,sans-serif;letter-spacing:1.5px;color:#4e87a6}
figure{margin:16px 15px 0;border:1px solid #23465c}figure img{display:block;width:100%;height:auto;aspect-ratio:1.5;object-fit:cover}figcaption{display:flex;align-items:center;gap:6px;padding:10px;font-size:10px;color:#87aabd;background:#091c30}figcaption>i{width:4px;height:4px;background:#3aa7cc}figcaption>span{margin-left:auto;color:#477a96;font:9px monospace}
.reference-section-label{margin:23px 18px 6px;font-size:10px;letter-spacing:2px;color:#5989a6}.zone-list{list-style:none;padding:0 18px;margin:0}.zone-list li{display:flex;align-items:center;gap:12px;padding:15px 0;border-bottom:1px solid #16344b}.zone-list em{color:#3b8db4;font:12px monospace;border:1px solid #24516b;padding:7px;background:#0c273f}.zone-list b{font-size:12px;font-weight:500;letter-spacing:1px}.zone-list li div{display:flex;flex-direction:column;gap:6px}.zone-list li div span{font-size:10px;color:#668da8;line-height:1.6}
.palette-section{padding:20px 18px 0}.palette-section>span{color:#96b4c9;font-size:11px}.palette{display:flex;gap:6px;margin:12px 0 8px}.palette i{height:15px;flex:1;background:var(--swatch);border:1px solid #5a8ca244}.palette-section small{font-size:9px;color:#597f9b}.reference-note{font-size:10px;line-height:1.9;color:#6487a1;margin:20px 18px;padding:12px 0;border-top:1px solid #173c56}
.preview-footer{height:48px;flex-shrink:0;display:flex;align-items:center;gap:15px;font-size:10px;color:#547d99}.preview-footer>span{display:flex;gap:7px;align-items:center;color:#72b2d0}.preview-footer p{margin:0}.preview-footer small{margin-left:auto;font:9px Arial,sans-serif;letter-spacing:3px;color:#376681}
@media(min-width:1700px){.preview-workspace{grid-template-columns:minmax(0,1fr) 340px}.reference-panel{font-size:14px}.zone-list li{padding:20px 0}.reference-note{font-size:11px}}
@media(max-width:1000px){.model-preview{padding:0 14px}.preview-header{height:78px;gap:15px}.preview-brand{padding-right:15px}.preview-brand strong{font-size:26px}.preview-title h1{font-size:17px;letter-spacing:1px}.preview-title small{font-size:8px}.preview-title h1 span{margin:0 6px}.preview-state{display:none}.reference-toggle{margin-left:auto;font-size:10px}.preview-workspace{gap:12px;grid-template-columns:minmax(0,1fr) 244px}.stage-caption{bottom:56px}.zone-list li{gap:8px}.zone-list li div span{font-size:9px}}
@media(max-width:700px){.preview-title small{letter-spacing:1px}.preview-title h1{font-size:14px}.preview-title h1 span{margin:0 4px}.preview-brand{display:none}.preview-workspace{grid-template-columns:minmax(0,1fr)}.reference-panel{display:none}.reference-toggle{display:none}.stage-caption{left:16px;bottom:56px}.preview-footer small{display:none}.preview-footer{font-size:9px}.stage-heading{left:16px;top:18px}.stage-heading small{display:none}}
@media(max-height:560px){.preview-header{height:68px}.preview-workspace{padding-top:12px}.preview-footer{height:32px}.stage-caption{display:none}.stage-heading{top:12px;font-size:12px}}
</style>
