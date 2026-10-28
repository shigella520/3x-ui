import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginPage from '@/pages/login/LoginPage';
import { HttpUtil, Msg } from '@/utils';
import { renderWithProviders } from './test-utils';

vi.mock('@/components/sponsor/SponsorSlot', () => ({ default: () => null }));

describe('login form', () => {
  beforeEach(() => {
    vi.mocked(HttpUtil.post).mockClear();
  });

  it.each([false, true])(
    'keeps credential fields identifiable and submits input events (2FA: %s)',
    async (twoFactorEnabled) => {
      vi.mocked(HttpUtil.post).mockImplementation(async (url: string) =>
        url === '/getTwoFactorEnable'
          ? new Msg(true, '', twoFactorEnabled)
          : new Msg(false, '', null),
      );
      renderWithProviders(<LoginPage />);

      const username = (await screen.findByLabelText('Username')) as HTMLInputElement;
      const password = screen.getByLabelText('Password') as HTMLInputElement;
      expect(document.activeElement).not.toBe(username);
      expect(username.id).toBe('username');
      expect(username.name).toBe('username');
      expect(username.autocomplete).toBe('username');
      expect(password.id).toBe('password');
      expect(password.name).toBe('password');
      expect(password.autocomplete).toBe('current-password');
      expect(password.type).toBe('password');

      fireEvent.input(username, { target: { value: 'mobile-user' } });
      fireEvent.input(password, { target: { value: 'test-password' } });
      if (twoFactorEnabled) {
        const code = document.getElementById('twoFactorCode') as HTMLInputElement;
        expect(code.name).toBe('twoFactorCode');
        expect(code.autocomplete).toBe('one-time-code');
        expect(code.inputMode).toBe('numeric');
        fireEvent.input(code, { target: { value: '123456' } });
      } else {
        expect(document.getElementById('twoFactorCode')).toBeNull();
      }

      fireEvent.submit(username.form!);
      await waitFor(() =>
        expect(HttpUtil.post).toHaveBeenCalledWith('/login', {
          username: 'mobile-user',
          password: 'test-password',
          twoFactorCode: twoFactorEnabled ? '123456' : '',
        }),
      );
      expect(username.value).toBe('mobile-user');
      expect(password.value).toBe('test-password');
    },
  );
});
