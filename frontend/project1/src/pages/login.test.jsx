import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Login from './login';
import { BrowserRouter, useNavigate } from 'react-router-dom';

// Mock useNavigate
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

describe('Login Component', () => {
  const mockNavigate = vi.fn();
  const mockSetLogin = vi.fn();
  const mockSetUser = vi.fn();

  beforeEach(() => {
    useNavigate.mockReturnValue(mockNavigate);
    localStorage.clear(); // Clear localStorage before each test
    vi.clearAllMocks(); // Clear mocks before each test
  });

  it('should render the login form elements', () => {
    render(
      <BrowserRouter>
        <Login login={false} setLogin={mockSetLogin} setUser={mockSetUser} />
      </BrowserRouter>
    );

    // Check for email input
    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toBeInTheDocument();

    // Check for password input
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toBeInTheDocument();

    // Check for the login button
    const loginButton = screen.getByRole('button', { name: /^sign in$/i });
    expect(loginButton).toBeInTheDocument();
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Login login={false} setLogin={mockSetLogin} setUser={mockSetUser} />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /^sign in$/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'Password123');
    await user.click(loginButton);

    // Assert that navigate was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    // Assert localStorage updates
    expect(localStorage.getItem('token')).toBe('mock-jwt-token-12345');
    expect(localStorage.getItem('userId')).toBe('mock-user-id');
    const storedUser = JSON.parse(localStorage.getItem('user'));
    expect(storedUser).toEqual({
        name: 'Mock User',
        username: 'Mock User',
        email: 'test@example.com',
        mobile: undefined, // MSW response doesn't include mobile
        _id: 'mock-user-id',
        role: 'Farmer',
        avatar: '/1.png'
    });

    // Assert setLogin and setUser were called
    expect(mockSetLogin).toHaveBeenCalledWith(true);
    expect(mockSetUser).toHaveBeenCalledWith(storedUser);
  });

  it('should handle failed login', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <Login login={false} setLogin={mockSetLogin} setUser={mockSetUser} />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /^sign in$/i });

    await user.type(emailInput, 'fail@example.com'); // Use email that triggers failure in msw handler
    await user.type(passwordInput, 'WrongPassword123');
    await user.click(loginButton);

    // Assert that the error message is displayed in the DOM
    await waitFor(() => {
      const errorMessage = screen.getByText('Invalid email or password');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('error-message');
    });

    // Assert that navigate was NOT called
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSetLogin).not.toHaveBeenCalled();
    expect(mockSetUser).not.toHaveBeenCalled();
  });
});