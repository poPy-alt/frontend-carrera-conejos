import { useState, useCallback, useEffect } from 'react';
import AuthScreen from '@/components/AuthScreen';
import RockPaperScissors from '@/components/RockPaperScissors';
import GameBoard from '@/components/GameBoard';
import PlayerHub from '@/components/PlayerHub';
import GameLobby from '@/components/GameLobby';
import { updateStats, type User } from '@/lib/auth';
import { socket } from '@/lib/socket';

type GamePhase = 'auth' | 'hub' | 'lobby' | 'rps' | 'game';

const Index = () => {
  const [phase, setPhase] = useState<GamePhase>('auth');
  const [player, setPlayer] = useState<User | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);
  const [room, setRoom] = useState<string | null>(null);
  const [firstPlayer, setFirstPlayer] = useState<1 | 2>(1);
  const [profiles, setProfiles] = useState<{p1?: any, p2?: any}>({});
  const [roomScenario, setRoomScenario] = useState<'rabbits' | 'pandas'>('rabbits');

  const handleAuth = useCallback((user: User) => {
    setPlayer(user);
    setPhase('hub');
  }, []);

  const handleContinueFromHub = useCallback((updatedUser: User) => {
    setPlayer(updatedUser);
    setPhase('lobby');
  }, []);

  const handleExit = useCallback(() => {
    setRoom(null);
    setProfiles({});
    setPhase('lobby');
  }, []);

  // Sync Global Listener
  useEffect(() => {
    const handleSync = (data: any) => {
      setProfiles({ p1: data.p1, p2: data.p2 });
      if (data.roomScenario) setRoomScenario(data.roomScenario);
    };
    
    socket.on('room_players_sync', handleSync);
    return () => { socket.off('room_players_sync', handleSync); };
  }, []);

  const handleJoinRoom = useCallback((roomName: string, pNumber: 1 | 2) => {
    setRoom(roomName);
    setPlayerNumber(pNumber);

    socket.emit('join_game', { 
      room: roomName, 
      profile: { ...player, scenario: player?.scenario || 'rabbits' },
      playerNumber: pNumber
    });
    setPhase('rps');
  }, [player]);

  const handleRPSWinner = useCallback((winner: 1 | 2) => {
    setFirstPlayer(winner);
    setPhase('game');
  }, []);

  const handleGameEnd = useCallback(async (winner: 1 | 2) => {
    if (player) {
      const won = (winner === playerNumber);
      await updateStats(player.username, won);
    }
  }, [player, playerNumber]);

  const handleRestart = useCallback(() => {
    setPhase('rps');
  }, []);

  if (phase === 'auth') {
    return <AuthScreen playerNumber={1} onAuth={handleAuth} />;
  }

  if (phase === 'hub') {
    return (
      <PlayerHub 
        user={player!} 
        onContinue={handleContinueFromHub} 
        onLogout={() => window.location.reload()} 
      />
    );
  }

  if (phase === 'lobby') {
    return <GameLobby onJoin={handleJoinRoom} />;
  }

  if (phase === 'rps') {
    return (
      <RockPaperScissors
        player1Name={playerNumber === 1 ? player!.username : 'Oponente'}
        player2Name={playerNumber === 2 ? player!.username : 'Oponente'}
        onWinner={handleRPSWinner}
        online={true}
        room={room!}
        playerNumber={playerNumber}
        playerProfile={player}
        profiles={profiles}
        roomScenario={roomScenario}
      />
    );
  }

  return (
    <GameBoard
      player1Name={playerNumber === 1 ? player!.username : 'Oponente'}
      player2Name={playerNumber === 2 ? player!.username : 'Oponente'}
      firstPlayer={firstPlayer}
      onGameEnd={handleGameEnd}
      onRestart={handleRestart}
      onExit={handleExit}
      online={true}
      room={room!}
      playerNumber={playerNumber}
      playerProfile={player}
      profiles={profiles}
      roomScenario={roomScenario}
    />
  );
};

export default Index;
