import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth';

describe('authentication screen', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/login');
    vi.restoreAllMocks();
  });

  it('displays backend login failures to the user', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Refresh token is required.' }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Email or password is incorrect.' }), { status: 401 }));

    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>,
    );

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'invalid-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
