import { http, HttpResponse } from 'msw'
import { mockFactories } from './factories'

export const handlers = [
  // Auth handlers
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      user: mockFactories.createUser(),
      token: 'mock-jwt-token',
    })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true })
  }),

  // Project handlers
  http.get('/api/projects', () => {
    return HttpResponse.json({
      projects: mockFactories.createArray(mockFactories.createProject, 10),
    })
  }),

  http.get('/api/projects/:id', ({ params }) => {
    return HttpResponse.json({
      project: mockFactories.createProject({ id: params.id }),
    })
  }),

  // Library handlers
  http.get('/api/library/items', () => {
    return HttpResponse.json({
      items: mockFactories.createArray(mockFactories.createLibraryItem, 20),
    })
  }),

  http.get('/api/library/items/:id', ({ params }) => {
    return HttpResponse.json({
      item: mockFactories.createLibraryItem({ id: params.id }),
    })
  }),

  // Purchase order handlers
  http.get('/api/purchase-orders', () => {
    return HttpResponse.json({
      purchaseOrders: mockFactories.createArray(mockFactories.createPurchaseOrder, 15),
    })
  }),

  http.post('/api/purchase-orders', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      purchaseOrder: mockFactories.createPurchaseOrder(body),
    })
  }),

  // Cost estimate handlers
  http.get('/api/estimates', () => {
    return HttpResponse.json({
      estimates: mockFactories.createArray(mockFactories.createCostEstimate, 8),
    })
  }),

  http.post('/api/estimates', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({
      estimate: mockFactories.createCostEstimate(body),
    })
  }),
]