import { useState } from 'react';
import { register, login, type User } from '@/lib/auth';

interface AuthScreenProps {
  playerNumber: 1 | 2;
  onAuth: (user: User) => void;
}

const AuthScreen = ({ playerNumber, onAuth }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(username, password);
        if (result.success && result.user) {
          onAuth(result.user);
        } else {
          setError(result.error || 'Error al iniciar sesión');
        }
      } else {
        const result = await register(username, password);
        if (result.success) {
          const loginResult = await login(username, password);
          if (loginResult.success && loginResult.user) {
            onAuth(loginResult.user);
          }
        } else {
          setError(result.error || 'Error al registrarse');
        }
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen notebook-bg">
      <div className="card-notebook p-8 w-full max-w-md mx-4">
        <h2 className="text-4xl font-bold text-center mb-2 text-foreground">
          🐰 Jugador {playerNumber}
        </h2>
        <p className="text-center text-2xl mb-6 text-muted-foreground">
          {isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xl mb-1 text-foreground">Nombre</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-notebook"
              placeholder="Tu nombre..."
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xl mb-1 text-foreground">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-notebook"
              placeholder="Tu contraseña..."
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-destructive text-lg text-center">{error}</p>
          )}

          <button type="submit" className="btn-notebook w-full text-2xl" disabled={loading}>
            {loading ? '⏳ Procesando...' : (isLogin ? '🔑 Entrar' : '✏️ Registrarse')}
          </button>
        </form>

        <button
          onClick={() => { setIsLogin(!isLogin); setError(''); }}
          className="w-full text-center mt-4 text-xl text-primary underline"
          disabled={loading}
        >
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
