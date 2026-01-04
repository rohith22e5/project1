import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock the login endpoint
  http.post('http://localhost:5000/api/auth/login', async ({ request }) => {
    const { email } = await request.json();

    // Simulate a failure response
    if (email === 'fail@example.com') {
      return new HttpResponse(JSON.stringify({ message: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Simulate a success response
    return HttpResponse.json({
      _id: 'mock-user-id',
      username: 'Mock User',
      email: email,
      token: 'mock-jwt-token-12345',
    });
  }),
];
