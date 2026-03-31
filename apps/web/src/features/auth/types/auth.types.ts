export interface AuthUser {
  id: string;
  username: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
