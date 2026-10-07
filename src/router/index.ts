import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import WorkOrderMobileView from '../views/WorkOrderMobileView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/huijishan-model', name: 'huijishan-model-preview', component: () => import('../views/HuijishanModelPreviewView.vue') },
    { path: '/park-model', name: 'park-model-preview', component: () => import('../views/ParkModelPreviewView.vue') },
    { path: '/', name: 'group-dashboard', component: DashboardView },
    { path: '/park/jiaxing', redirect: '/park/huijishan' },
    { path: '/park/:parkId', name: 'park-dashboard', component: DashboardView },
    { path: '/work-order', name: 'work-order-mobile', component: WorkOrderMobileView },
    { path: '/:section', name: 'section', component: DashboardView },
  ],
})
