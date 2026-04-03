import { useState, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';

type Choice = 'rock' | 'paper' | 'scissors';

interface RPSProps {
  player1Name: string;
  player2Name: string;
  onWinner: (winner: 1 | 2) => void;
  online?: boolean;
  room?: string;
  playerNumber?: 1 | 2;
  playerProfile?: any;
  profiles: { p1?: any; p2?: any };
  roomScenario: 'rabbits' | 'pandas';
}

const EMOJIS: Record<Choice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

const CHOICES: Choice[] = ['rock', 'paper', 'scissors'];
const LABELS: Record<Choice, string> = { rock: 'Piedra', paper: 'Papel', scissors: 'Tijera' };

function getWinner(c1: Choice, c2: Choice): 0 | 1 | 2 {
  if (c1 === c2) return 0;
  if ((c1 === 'rock' && c2 === 'scissors') || (c1 === 'scissors' && c2 === 'paper') || (c1 === 'paper' && c2 === 'rock')) return 1;
  return 2;
}

const RockPaperScissors = ({ player1Name, player2Name, onWinner, online, room, playerNumber, playerProfile, profiles, roomScenario }: RPSProps) => {
  const [p1Choice, setP1Choice] = useState<Choice | null>(null);
  const [p2Choice, setP2Choice] = useState<Choice | null>(null);
  const [p1Ready, setP1Ready] = useState(false);
  const [p2Ready, setP2Ready] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [shuffleIdx, setShuffleIdx] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [winner, setWinner] = useState<0 | 1 | 2>(0);

  // Sync WiFi RPS Choices
  useEffect(() => {
    if (!online || !socket) return;

    socket.on('player_ready_sync', (data) => {
      if (data.playerNumber === 1) setP1Ready(true);
      else setP2Ready(true);
    });

    socket.on('rps_duel_start', (data) => {
      // Both choices revealed and animation starts
      setP1Choice(data.p1);
      setP2Choice(data.p2);
      setAnimating(true);
      setResult(null);
    });

    return () => {
      socket.off('player_ready_sync');
      socket.off('rps_duel_start');
    };
  }, [online]);

  // Handle local vs online clicks
  const handleChoice = (c: Choice) => {
    if (online) {
      if (playerNumber === 1 && !p1Ready) {
        setP1Ready(true);
        socket.emit('rps_choice', { room, playerNumber: 1, choice: c });
      } else if (playerNumber === 2 && !p2Ready) {
        setP2Ready(true);
        socket.emit('rps_choice', { room, playerNumber: 2, choice: c });
      }
    } else {
      // Local same-device play
      if (!p1Choice) setP1Choice(c);
      else if (!p2Choice) setP2Choice(c);
    }
  };

  useEffect(() => {
    if (!online && p1Choice && p2Choice && !animating) {
      setAnimating(true);
    }
  }, [p1Choice, p2Choice, animating, online]);

  useEffect(() => {
    if (!animating) return;
    const interval = setInterval(() => {
      setShuffleIdx(i => (i + 1) % 3);
    }, 150);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      setAnimating(false);
      const w = getWinner(p1Choice!, p2Choice!);
      setWinner(w);
      if (w === 0) {
        setResult('¡Empate! De nuevo...');
        setTimeout(() => {
          setP1Choice(null);
          setP2Choice(null);
          setP1Ready(false);
          setP2Ready(false);
          setResult(null);
          setWinner(0);
        }, 1500);
      } else {
        setResult(`¡${w === 1 ? player1Name : player2Name} gana!`);
        setTimeout(() => onWinner(w as 1 | 2), 2000);
      }
    }, 2000); // 2 seconds of suspense

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [animating, p1Choice, p2Choice, player1Name, player2Name, onWinner]);

  const renderButtons = (pNum: number, currentReady: boolean, isOther: boolean) => {
    // In online mode, hide choices of the other player
    if (online && isOther) {
      return (
        <div className="flex h-24 items-center justify-center card-notebook opacity-50">
          <p className="text-2xl animate-pulse">
            {currentReady ? '✅ Ya eligió. Esperándote...' : '🤔 Está pensando...'}
          </p>
        </div>
      );
    }

    const alreadyClicked = online ? (pNum === 1 ? p1Ready : p2Ready) : (pNum === 1 ? !!p1Choice : !!p2Choice);

    return (
      <div className="flex gap-4 justify-center">
        {CHOICES.map(c => {
          const isChosen = online 
            ? (pNum === 1 ? (p1Ready && playerNumber === 1) : (p2Ready && playerNumber === 2)) 
            : (pNum === 1 ? p1Choice === c : p2Choice === c);

          return (
            <button
              key={c}
              onClick={() => handleChoice(c)}
              className={`text-5xl p-4 rounded-xl transition-all duration-200 ${
                alreadyClicked 
                  ? (isChosen ? 'scale-110 ring-4 ring-primary bg-muted' : 'opacity-30')
                  : 'hover:scale-110 hover:bg-muted cursor-pointer'
              }`}
              disabled={alreadyClicked || animating}
            >
              <span>{EMOJIS[c]}</span>
              <span className="block text-lg mt-1 text-foreground">{LABELS[c]}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const name1 = profiles.p1?.username || player1Name;
  const name2 = profiles.p2?.username || player2Name;
  const color1 = profiles.p1?.stripeColor || 'hsl(var(--player1))';
  const color2 = profiles.p2?.stripeColor || 'hsl(var(--player2))';

  const scenarioTitle = roomScenario === 'pandas' ? 'Duelo Panda' : 'Duelo Conejo';
  const scenarioIcons = roomScenario === 'pandas' ? '🐼 🎋 ☯️' : '✊ ✋ ✌️';

  return (
    <div className={`flex items-center justify-center min-h-screen ${roomScenario === 'pandas' ? 'bg-[#f0f9f0]' : 'notebook-bg'}`}>
      <div className="card-notebook p-8 max-w-2xl w-full mx-4 shadow-2xl">
        <h2 className="text-4xl font-bold text-center mb-8 text-foreground">
          {scenarioIcons} {scenarioTitle}
        </h2>

        {animating ? (
          <div className="flex flex-col items-center py-12">
            <div className="flex justify-center items-center gap-16">
              <div className="text-8xl animate-bounce">{EMOJIS[CHOICES[shuffleIdx]]}</div>
              <span className="text-5xl font-black text-pencil">VS</span>
              <div className="text-8xl animate-bounce" style={{ animationDelay: '0.1s' }}>{EMOJIS[CHOICES[(shuffleIdx + 1) % 3]]}</div>
            </div>
            <p className="text-3xl mt-8 font-bold animate-pulse text-pencil-light">Duelo en curso...</p>
          </div>
        ) : result ? (
          <div className="text-center py-8">
            <div className="flex justify-center items-center gap-12 mb-6">
              <div className="flex flex-col items-center">
                <span className="text-8xl" style={{ filter: `drop-shadow(0 0 8px ${color1})` }}>{EMOJIS[p1Choice!]}</span>
                <span className="text-xl font-bold mt-2" style={{ color: color1 }}>{name1}</span>
              </div>
              <span className="text-4xl text-pencil-light italic">vs</span>
              <div className="flex flex-col items-center">
                <span className="text-8xl" style={{ filter: `drop-shadow(0 0 8px ${color2})` }}>{EMOJIS[p2Choice!]}</span>
                <span className="text-xl font-bold mt-2" style={{ color: color2 }}>{name2}</span>
              </div>
            </div>
            <p className={`text-4xl font-black ${winner === 0 ? 'text-secondary' : 'text-accent'}`}>
              {winner === 1 ? `¡${name1} gana!` : winner === 2 ? `¡${name2} gana!` : '¡Empate! De nuevo...'}
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            <div>
              <h3 className="text-2xl font-bold text-center mb-4" style={{ color: color1 }}>
                {roomScenario === 'pandas' ? '🐼' : '🐰'} {name1} {p1Ready ? '✅ ¡Listo!' : (online && playerNumber === 2 ? '🤔 Pensando...' : '👈 Elige tu opción')}
              </h3>
              {renderButtons(1, p1Ready, online && playerNumber === 2)}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-pencil-light"></div></div>
              <div className="relative flex justify-center"><span className="bg-card px-4 text-2xl font-bold italic text-pencil-light">o</span></div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-center mb-4" style={{ color: color2 }}>
                {roomScenario === 'pandas' ? '🐼' : '🐰'} {name2} {p2Ready ? '✅ ¡Listo!' : (online && playerNumber === 1 ? '🤔 Pensando...' : '👈 Elige tu opción')}
              </h3>
              {renderButtons(2, p2Ready, online && playerNumber === 1)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RockPaperScissors;
