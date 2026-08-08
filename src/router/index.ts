import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  //history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../pages/Activity.vue'),
    },
    { 
      path: '/analyze',
      name: 'analyze',
      component: () => import('../pages/Analyze.vue'),
    },
  ],
})

export default router
