import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import WorkOrderMobileView from '../views/WorkOrderMobileView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardView },
    { path: '/work-order', name: 'work-order-mobile', component: WorkOrderMobileView },
    { path: '/:section', name: 'section', component: DashboardView },
  ],
})
