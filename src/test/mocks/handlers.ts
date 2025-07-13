import { http, HttpResponse } from 'msw';
import { createLibraryItem } from '../factories/libraryFactory';

export const handlers = [
  // Mock Supabase API endpoints
  http.get('/rest/v1/library_items', () => {
    const mockItems = Array.from({ length: 10 }, () => createLibraryItem());
    return HttpResponse.json(mockItems, {
      headers: {
        'Content-Range': '0-9/10',
      },
    });
  }),

  http.post('/rest/v1/library_items', async ({ request }) => {
    const data = await request.json();
    const newItem = createLibraryItem(data as any);
    return HttpResponse.json(newItem, { status: 201 });
  }),

  http.patch('/rest/v1/library_items', async ({ request }) => {
    const data = await request.json();
    const updatedItem = createLibraryItem(data as any);
    return HttpResponse.json(updatedItem);
  }),

  http.delete('/rest/v1/library_items', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Mock project rates endpoint
  http.get('/rest/v1/project_rates', () => {
    return HttpResponse.json({
      project_id: 'test-project',
      materials: {
        'CEMENT': 0.15,
        'SAND': 0.05,
        'GRAVEL': 0.03,
      },
      labour: {
        'MASON': 40,
        'HELPER': 20,
      },
      equipment: {
        'MIXER': 50,
      },
      effective_date: new Date().toISOString(),
    });
  }),

  // Mock authentication endpoints
  http.post('/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
      },
    });
  }),

  // Catch-all handler for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(
      `Found an unhandled ${request.method} request to ${request.url}`
    );
  }),
];