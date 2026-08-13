import { createRouter, createWebHistory } from 'vue-router'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',     name: 'home', component: () => import('../pages/Home.vue'), },
    { path: '/ride', name: 'ride', component: () => import('../pages/Ride.vue'), },
    { path: '/edit', name: 'edit', component: () => import('../pages/Edit.vue'), },
  ],
})

export default router
