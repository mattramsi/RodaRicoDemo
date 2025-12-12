import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://rodarico.app.br/api';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthRequest {
  grant_type: 'username';
  nickname: string;
  refresh_token?: string;
}

const TOKEN_KEY = '@RodaRico:access_token';
const REFRESH_TOKEN_KEY = '@RodaRico:refresh_token';
const EXPIRES_IN_KEY = '@RodaRico:expires_in';

export class AuthService {
  static async login(nickname: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'username',
        nickname,
      } as AuthRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Auth failed: ${error}`);
    }

    const data: AuthResponse = await response.json();
    await AuthService.storeTokens(data);
    return data;
  }

  static async refreshToken(): Promise<AuthResponse | null> {
    const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'username',
          refresh_token: refreshToken,
        } as AuthRequest),
      });

      if (!response.ok) {
        await AuthService.clearTokens();
        return null;
      }

      const data: AuthResponse = await response.json();
      await AuthService.storeTokens(data);
      return data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await AuthService.clearTokens();
      return null;
    }
  }

  static async storeTokens(data: AuthResponse): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, data.access_token],
      [REFRESH_TOKEN_KEY, data.refresh_token],
      [EXPIRES_IN_KEY, String(data.expires_in)],
    ]);
  }

  static async getAccessToken(): Promise<string | null> {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    console.log('[AuthService] Token recuperado:', token ? `${token.substring(0, 20)}...` : 'null');
    return token;
  }

  static async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  }

  static async clearTokens(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_IN_KEY]);
  }

  static async isTokenExpired(): Promise<boolean> {
    const expiresIn = await AsyncStorage.getItem(EXPIRES_IN_KEY);
    if (!expiresIn) return true;
    // Assume token was issued at storage time, check if expired
    // This is a simple check - in production you'd decode JWT and check exp
    return false; // Simplified - implement proper expiration check if needed
  }
}

