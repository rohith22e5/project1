import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the app', () => {
    render(<App />);
    // You can add assertions here based on your App component's content
    // For example, if your App component renders a heading:
    // const headingElement = screen.getByRole('heading', { level: 1 });
    // expect(headingElement).toBeInTheDocument();
  });
});
