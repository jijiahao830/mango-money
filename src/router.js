import { createRouter, createWebHistory } from 'vue-router';

const pages = [
  ['home', '/home'],
  ['middle', '/middle-platform'],
  ['financePlatform', '/finance-platform'],
  ['deposit', '/deposit'],
  ['balance', '/balance'],
  ['statement', '/statement'],
  ['history', '/history'],
  ['push', '/push'],
  ['accounts', '/accounts'],
  ['tableManagement', '/table-management']
];

const routes = [
  { path: '/', redirect: '/home' },
  ...pages.map(([page, path]) => ({
    path,
    name: page,
    component: { template: '<div />' },
    meta: { page }
  })),
  { path: '/:pathMatch(.*)*', redirect: '/home' }
];

export const pageRoutes = Object.fromEntries(pages);

export default createRouter({
  history: createWebHistory(),
  routes
});
