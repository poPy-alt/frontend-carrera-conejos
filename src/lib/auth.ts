const API_BASE_URL = (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:1000`) + '/api';

export interface User {
  username: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  skin?: string;
  stripeColor?: string;
  scenario?: string;
}

export async function register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (username.length < 2) return { success: false, error: 'Nombre muy corto' };
    if (password.length < 3) return { success: false, error: 'Contraseña muy corta' };

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Error al registrar' };

    return { success: true };
  } catch (err) {
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

export async function login(username: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) return { success: false, error: data.error || 'Usuario o contraseña incorrectos' };

    // Set token in localStorage if needed for future authenticated requests
    if (data.token) {
      localStorage.setItem('notebook_game_token', data.token);
    }

    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: 'Error de conexión con el servidor' };
  }
}

export async function updateProfile(username: string, skin: string, stripeColor: string, scenario: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, skin, stripeColor, scenario })
    });
    return response.ok;
  } catch (err) {
    console.error('Error updating profile', err);
    return false;
  }
}

export async function updateStats(username: string, won: boolean): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/users/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, won })
    });
  } catch (err) {
    console.error('Error updating stats', err);
  }
}

export async function getStats(username: string): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/stats/${username}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    return null;
  }
}

export async function getLeaderboard(): Promise<User[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/users/leaderboard`);
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    return [];
  }
}
