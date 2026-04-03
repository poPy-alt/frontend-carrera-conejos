import { useState } from 'react';

interface GameLobbyProps {
  onJoin: (roomName: string, playerNumber: 1 | 2) => void;
}

const GameLobby = ({ onJoin }: GameLobbyProps) => {
  const [room, setRoom] = useState('');
  const [mode, setMode] = useState<'selection' | 'create' | 'join'>('selection');

  if (mode === 'selection') {
    return (
      <div className="flex items-center justify-center min-h-screen notebook-bg">
        <div className="card-notebook p-8 w-full max-w-md mx-4 text-center">
          <h2 className="text-4xl font-bold mb-6 text-foreground">🌍 Multijugador WiFi</h2>
          <div className="space-y-4">
            <button 
              onClick={() => setMode('create')}
              className="btn-notebook w-full text-2xl py-4"
            >
              ➕ Crear Sala
            </button>
            <button 
              onClick={() => setMode('join')}
              className="btn-notebook w-full text-2xl py-4 bg-secondary hover:bg-secondary/90"
            >
              🤝 Unirse a Sala
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen notebook-bg">
      <div className="card-notebook p-8 w-full max-w-md mx-4 text-center">
        <h2 className="text-4xl font-bold mb-4 text-foreground">
          {mode === 'create' ? '➕ Crear Sala' : '🤝 Unirse a Sala'}
        </h2>
        <p className="text-xl mb-6 text-muted-foreground">
          {mode === 'create' 
            ? 'Ponle un nombre a tu sala y dile a tu amigo que escriba el mismo.' 
            : 'Escribe el nombre de la sala que creó tu amigo.'}
        </p>
        
        <input
          type="text"
          value={room}
          onChange={e => setRoom(e.target.value)}
          className="input-notebook mb-6"
          placeholder="Nombre de la sala..."
          autoFocus
        />

        <div className="flex flex-col gap-4">
          <button 
            onClick={() => room && onJoin(room, mode === 'create' ? 1 : 2)}
            disabled={!room}
            className="btn-notebook text-2xl py-3"
          >
            {mode === 'create' ? '🚀 ¡Crear y Empezar!' : '✅ ¡Unirse ahora!'}
          </button>
          <button 
            onClick={() => setMode('selection')}
            className="text-xl text-muted-foreground underline"
          >
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
