import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { socket } from '@/lib/socket';

const ROWS = 20;
const COLS = 18;
const GAP = 32;
const PADDING = 20;
const NUM_OBSTACLES = 23;
const BOARD_W = (COLS - 1) * GAP + PADDING * 2;
const BOARD_H = (ROWS - 1) * GAP + PADDING * 2;

interface Pos {
  r: number;
  c: number;
}

interface GameBoardProps {
  player1Name: string;
  player2Name: string;
  firstPlayer: 1 | 2;
  onGameEnd: (winner: 1 | 2) => void;
  onRestart?: () => void;
  onExit?: () => void;
  online?: boolean;
  room?: string;
  playerNumber?: 1 | 2;
  playerProfile?: any;
  profiles: { p1?: any; p2?: any };
  roomScenario: 'rabbits' | 'pandas';
}

function posKey(r: number, c: number) {
  return `${r},${c}`;
}

function screenX(c: number) { return PADDING + c * GAP; }
function screenY(r: number) { return PADDING + r * GAP; }

function generateObstacles(center: Pos): Set<string> {
  const blocked = new Set<string>();
  const reserved = new Set([
    posKey(center.r, center.c),
    posKey(0, 0), posKey(0, 1), posKey(1, 0),
    posKey(ROWS - 1, COLS - 1), posKey(ROWS - 1, COLS - 2), posKey(ROWS - 2, COLS - 1),
  ]);
  while (blocked.size < NUM_OBSTACLES) {
    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);
    const k = posKey(r, c);
    if (!reserved.has(k) && !blocked.has(k)) blocked.add(k);
  }
  return blocked;
}

function isNeighbor(a: Pos, b: Pos) {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

const DiceFace = ({ value }: { value: number }) => {
  const dots: Record<number, [number, number][]> = {
    1: [[50,50]],
    2: [[28,28],[72,72]],
    3: [[28,28],[50,50],[72,72]],
    4: [[28,28],[72,28],[28,72],[72,72]],
    5: [[28,28],[72,28],[50,50],[28,72],[72,72]],
    6: [[28,28],[72,28],[28,50],[72,50],[28,72],[72,72]],
  };
  return (
    <div className="w-16 h-16 card-notebook relative rounded-lg bg-card shadow-md border-2 border-pencil">
      {dots[value]?.map(([x, y], i) => (
        <div key={`dot-${i}`} className="absolute w-3 h-3 rounded-full bg-foreground"
          style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }} />
      ))}
    </div>
  );
};

const GameBoard = ({ player1Name, player2Name, firstPlayer, onGameEnd, onRestart, onExit, online, room, playerNumber, playerProfile, profiles, roomScenario }: GameBoardProps) => {
  const center: Pos = useMemo(() => ({ r: Math.floor(ROWS / 2), c: Math.floor(COLS / 2) }), []);
  const [obstacles, setObstacles] = useState<Set<string>>(new Set());

  const [p1, setP1] = useState<Pos>({ r: 0, c: 0 });
  const [p2, setP2] = useState<Pos>({ r: ROWS - 1, c: COLS - 1 });
  const [turn, setTurn] = useState<1 | 2>(firstPlayer);
  const [movesLeft, setMovesLeft] = useState(0);
  const [dice, setDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [lives1, setLives1] = useState(3);
  const [lives2, setLives2] = useState(3);
  const [msg, setMsg] = useState(`¡${firstPlayer === 1 ? player1Name : player2Name} empieza!`);
  const [over, setOver] = useState(false);
  const [projectiles, setProjectiles] = useState<{ id: string, r: number, c: number }[]>([]);

  const isMyTurn = !online || turn === playerNumber;
  const [path1, setPath1] = useState<Pos[]>([{ r: 0, c: 0 }]);
  const [path2, setPath2] = useState<Pos[]>([{ r: ROWS - 1, c: COLS - 1 }]);

  const [rematchRequested, setRematchRequested] = useState(false);
  const [partnerWantsRematch, setPartnerWantsRematch] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState(false);

  // WiFi Sync Listeners
  useEffect(() => {
    if (!online || !socket) return;

    socket.emit('request_obstacles', room);

    socket.on('sync_obstacles', (obsArray: string[]) => {
      setObstacles(new Set(obsArray));
    });

    socket.on('spawn_projectile_sync', (data: { id: string, col: number }) => {
      setProjectiles(prev => [...prev, { id: data.id, r: -1, c: data.col }]);
    });

    const handleRestartSync = (data: any) => {
      setObstacles(new Set(data.obstacles));
      setP1({ r: 0, c: 0 });
      setP2({ r: ROWS - 1, c: COLS - 1 });
      setPath1([{ r: 0, c: 0 }]);
      setPath2([{ r: ROWS - 1, c: COLS - 1 }]);
      setLives1(3);
      setLives2(3);
      setOver(false);
      setMovesLeft(0);
      setDice(0);
      setProjectiles([]);
      setRematchRequested(false);
      setPartnerWantsRematch(false);
      setMsg("¡El juego se ha reiniciado!");
      if (onRestart) onRestart();
    };

    const handleRematchRequest = (data: any) => {
      if (data.playerNumber !== playerNumber) {
        setPartnerWantsRematch(true);
      }
    };

    const handlePartnerLeft = () => {
      setPartnerLeft(true);
    };

    socket.on('restart_game_sync', handleRestartSync);
    socket.on('player_wants_rematch', handleRematchRequest);
    socket.on('partner_left', handlePartnerLeft);

    const handleMove = (data: any) => {
      if (data.playerNumber === 1) { setP1(data.pos); setPath1(p => [...p, data.pos]); }
      else { setP2(data.pos); setPath2(p => [...p, data.pos]); }
      setMovesLeft(data.movesLeft);
      if (data.movesLeft === 0) setTurn(data.playerNumber === 1 ? 2 : 1);
    };

    const handleDice = (data: any) => {
      setDice(data.value);
      setMovesLeft(data.value);
      const name = data.playerNum === 1 ? (profiles.p1?.username || player1Name) : (profiles.p2?.username || player2Name);
      setMsg(`¡${name} tiró un ${data.value}!`);
    };

    const handleHit = (data: any) => {
      if (data.targetPlayer === 1) setLives1(l => Math.max(0, l - 1));
      else setLives2(l => Math.max(0, l - 1));
    };

    socket.on('player_move_sync', handleMove);
    socket.on('dice_roll_sync', handleDice);
    socket.on('player_hit_sync', handleHit);

    return () => {
      socket.off('sync_obstacles');
      socket.off('spawn_projectile_sync');
      socket.off('restart_game_sync', handleRestartSync);
      socket.off('player_wants_rematch', handleRematchRequest);
      socket.off('partner_left', handlePartnerLeft);
      socket.off('player_move_sync', handleMove);
      socket.off('dice_roll_sync', handleDice);
      socket.off('player_hit_sync', handleHit);
    };
  }, [online, player1Name, player2Name, playerNumber, room]);

  // Projectile loop
  const damagedProjectiles = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (over) return;
    const moveTimer = setInterval(() => {
      setProjectiles(prev => {
        const next = prev.map(p => ({ ...p, r: p.r + 0.5 })).filter(p => p.r < ROWS + 1);
        next.forEach(p => {
          if (!damagedProjectiles.current.has(p.id)) {
            const hitP1 = playerNumber === 1 && Math.abs(p.r - p1.r) < 0.6 && p.c === p1.c;
            const hitP2 = playerNumber === 2 && Math.abs(p.r - p2.r) < 0.6 && p.c === p2.c;
            if (hitP1 || hitP2) {
              damagedProjectiles.current.add(p.id);
              if (online) socket.emit('player_hit', { room, targetPlayer: playerNumber });
              if (hitP1) setLives1(l => Math.max(0, l - 1));
              if (hitP2) setLives2(l => Math.max(0, l - 1));
            }
          }
        });
        return next;
      });
    }, 150);
    
    return () => { clearInterval(moveTimer); };
  }, [over, p1, p2, online, room, playerNumber]);

  // Win/Loss
  useEffect(() => {
    if (lives1 <= 0) { setMsg(`💀 ${player1Name} perdió.`); setOver(true); onGameEnd(2); }
    else if (lives2 <= 0) { setMsg(`💀 ${player2Name} perdió.`); setOver(true); onGameEnd(1); }
  }, [lives1, lives2, player1Name, player2Name, onGameEnd]);

  const rollDice = useCallback(() => {
    if (rolling || movesLeft > 0 || over || !isMyTurn) return;
    setRolling(true);
    let count = 0;
    const iv = setInterval(() => {
      setDice(Math.floor(Math.random() * 6) + 1);
      if (++count > 10) {
        clearInterval(iv);
        const v = Math.floor(Math.random() * 6) + 1;
        setDice(v); setMovesLeft(v); setRolling(false);
        setMsg(`¡Dale! Tienes ${v} pasos.`);
        if (online) socket.emit('dice_roll', { room, value: v, playerNum: playerNumber });
      }
    }, 100);
  }, [rolling, movesLeft, over, isMyTurn, online, room, playerNumber]);

  const handleClick = useCallback((r: number, c: number) => {
    if (over || movesLeft <= 0 || !isMyTurn) return;
    const cur = turn === 1 ? p1 : p2;
    if (!isNeighbor(cur, { r, c })) return;
    
    if (obstacles.has(posKey(r, c))) {
      const targetP = turn;
      if (targetP === 1) setLives1(l => Math.max(0, l - 1));
      else setLives2(l => Math.max(0, l - 1));
      setMovesLeft(0); setTurn(turn === 1 ? 2 : 1);
      if (online) {
        socket.emit('player_move', { room, playerNumber, pos: cur, movesLeft: 0 });
        socket.emit('player_hit', { room, targetPlayer: targetP });
      }
      return;
    }

    const target = { r, c };
    if (turn === 1) { setP1(target); setPath1(p => [...p, target]); }
    else { setP2(target); setPath2(p => [...p, target]); }

    const nextMoves = movesLeft - 1;
    setMovesLeft(nextMoves);
    if (nextMoves === 0) setTurn(turn === 1 ? 2 : 1);
    if (online) socket.emit('player_move', { room, playerNumber, pos: target, movesLeft: nextMoves });

    if (r === center.r && c === center.c) {
      setMsg(`🎉 ¡${turn === 1 ? player1Name : player2Name} WIN!`);
      setOver(true); onGameEnd(turn);
    }
  }, [over, movesLeft, isMyTurn, p1, p2, turn, obstacles, center, online, room, playerNumber, player1Name, player2Name, onGameEnd]);

  const handlePlayAgain = () => {
    setRematchRequested(true);
    socket.emit('play_again', { room, playerNumber });
  };

  const handleExit = () => {
    if (online && room) socket.emit('exit_game', { room });
    if (onExit) onExit();
  };

  const reachable = new Set<string>();
  const curMove = turn === 1 ? p1 : p2;
  if (movesLeft > 0 && !over && isMyTurn) {
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = curMove.r + dr, nc = curMove.c + dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) reachable.add(posKey(nr, nc));
    }
  }

  const getSkinImg = (prof: any, def: string) => {
    if (!prof) return def;
    if (prof.skin === 'panda-base') return '/pandas/panda.png';
    if (prof.skin === 'panda-alt') return '/pandas/panda2.png';
    if (prof.skin === 'panda-pro') return '/pandas/panda3.png';
    if (prof.skin === 'rabbit-alt' || prof.skin === 'rabbit-shadow') return '/siluetados.png';
    return '/siluetaconejo.png';
  };

  const skin1 = getSkinImg(profiles.p1, '/siluetaconejo.png');
  const skin2 = getSkinImg(profiles.p2, '/siluetados.png');
  const color1 = profiles.p1?.stripeColor || 'hsl(var(--player1))';
  const color2 = profiles.p2?.stripeColor || 'hsl(var(--player2))';

  const obsEmoji = roomScenario === 'pandas' ? '☯️' : '🪨';
  const projEmoji = roomScenario === 'pandas' ? '🎋' : '🥕';

  return (
    <div className={`min-h-screen p-3 flex flex-col items-center select-none relative ${roomScenario === 'pandas' ? 'bg-[#f0f9f0]' : 'notebook-bg'}`}>
      <div className="flex justify-between items-center w-full max-w-2xl mb-4">
        <div className="card-notebook px-4 py-2 border-l-4" style={{ borderLeftColor: color1 }}>
          <span className="text-xl font-bold block" style={{ color: color1 }}>{profiles.p1?.username || player1Name}</span>
          <span className="text-lg">❤️×{lives1}</span>
        </div>
        <div className="card-notebook px-4 py-2 text-center min-w-[150px]">
          <span className="text-lg font-bold block text-muted-foreground uppercase tracking-widest text-center">
            {roomScenario === 'pandas' ? '🐼 DUELO PANDA' : '🐰 DUELO CONEJO'}
          </span>
          <span className="text-xl font-black">{turn === 1 ? (profiles.p1?.username || player1Name) : (profiles.p2?.username || player2Name)}</span>
          <span className="block text-md mt-1">
             Pasos: <span className="text-primary">{movesLeft}</span> {online && playerNumber === turn && <span className="animate-bounce inline-block">👈</span>}
          </span>
        </div>
        <div className="card-notebook px-4 py-2 border-r-4 text-right" style={{ borderRightColor: color2 }}>
          <span className="text-xl font-bold block" style={{ color: color2 }}>{profiles.p2?.username || player2Name}</span>
          <span className="text-lg">❤️×{lives2}</span>
        </div>
      </div>

      <div className="h-10 mb-2">
        <p className="text-2xl font-bold bg-white/50 px-4 py-1 rounded-full shadow-sm">{msg}</p>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <button onClick={rollDice}
          disabled={rolling || movesLeft > 0 || over || !isMyTurn}
          className={`btn-notebook text-2xl px-10 ${(movesLeft > 0 || over || !isMyTurn) ? 'opacity-30' : 'animate-pulse hover:scale-105'}`}>
          🎲 Tirar
        </button>
        <div className="w-16 h-16 flex items-center justify-center">
            {(dice > 0 || rolling) && <div className={rolling ? 'animate-dice-roll' : 'animate-bounce-in'}><DiceFace value={dice} /></div>}
        </div>
      </div>

      <div className="card-notebook p-2 shadow-2xl relative bg-white/80 backdrop-blur-sm overflow-hidden" style={{ width: BOARD_W + 16, height: BOARD_H + 16 }}>
        <svg width={BOARD_W} height={BOARD_H} className="block overflow-visible"style={{ touchAction: 'none' }}>
          {Array.from({ length: ROWS }).map((_, r) => (
            <line key={`h${r}`} x1={screenX(0)} y1={screenY(r)} x2={screenX(COLS - 1)} y2={screenY(r)} stroke={roomScenario === 'pandas' ? '#d0e0d0' : "hsl(210,60%,82%)"} strokeWidth="1" />
          ))}
          {Array.from({ length: COLS }).map((_, c) => (
            <line key={`v${c}`} x1={screenX(c)} y1={screenY(0)} x2={screenX(c)} y2={screenY(ROWS - 1)} stroke={roomScenario === 'pandas' ? '#d0e0d0' : "hsl(210,60%,82%)"} strokeWidth="1" />
          ))}
          {path1.length > 1 && <polyline fill="none" stroke={color1} strokeWidth="3" opacity="0.4" strokeLinejoin="round" points={path1.map(p => `${screenX(p.c)},${screenY(p.r)}`).join(' ')} />}
          {path2.length > 1 && <polyline fill="none" stroke={color2} strokeWidth="3" opacity="0.4" strokeLinejoin="round" points={path2.map(p => `${screenX(p.c)},${screenY(p.r)}`).join(' ')} />}
          
          <circle cx={screenX(center.c)} cy={screenY(center.r)} r={10} fill="gold" className="animate-pulse shadow-glow" />
          
          {Array.from(obstacles).map(k => {
            const [r, c] = k.split(',').map(Number);
            return <g key={`obs-${k}`}><circle cx={screenX(c)} cy={screenY(r)} r={roomScenario === 'pandas' ? 8 : 6} fill={roomScenario === 'pandas' ? 'white' : "hsl(20,15%,55%)"} stroke={roomScenario === 'pandas' ? '#333' : 'none'} /><text x={screenX(c)} y={screenY(r) + 1} textAnchor="middle" dominantBaseline="central" fontSize={roomScenario === 'pandas' ? "14" : "10"}>{obsEmoji}</text></g>;
          })}
          
          {projectiles.map(p => (
            <g key={p.id} style={{ transition: 'all 150ms linear' }}>
              <text x={screenX(p.c)} y={screenY(p.r)} textAnchor="middle" dominantBaseline="central" fontSize="24" className="drop-shadow-sm">{projEmoji}</text>
            </g>
          ))}
          
          {Array.from(reachable).map(k => {
            const [r, c] = k.split(',').map(Number);
            return <circle key={`reach-${k}`} cx={screenX(c)} cy={screenY(r)} r={8} fill="hsl(var(--primary))" opacity="0.2" className="animate-pulse" />;
          })}
          
          <g style={{ transition: 'all 200ms ease-out', transform: `translate(${screenX(p1.c)}px, ${screenY(p1.r)}px)` }}>
            <image href={skin1} x="-25" y="-25" width="50" height="50" style={{ filter: `drop-shadow(0px 0px 6px ${color1})` }} />
          </g>
          <g style={{ transition: 'all 200ms ease-out', transform: `translate(${screenX(p2.c)}px, ${screenY(p2.r)}px)` }}>
            <image href={skin2} x="-25" y="-25" width="50" height="50" style={{ filter: `drop-shadow(0px 0px 6px ${color2})` }} />
          </g>
          
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const reachable_here = reachable.has(posKey(r, c));
              return (
                <circle 
                  key={`hit-${r}-${c}`} 
                  cx={screenX(c)} cy={screenY(r)} 
                  r={12} 
                  fill="transparent" 
                  onClick={() => reachable_here && handleClick(r, c)} 
                  style={{ cursor: reachable_here ? 'pointer' : 'default' }} 
                />
              );
            })
          )}
        </svg>
      </div>

      {partnerLeft && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="card-notebook p-10 max-w-lg w-full text-center space-y-6 transform animate-in zoom-in slide-in-from-bottom-10 duration-500">
            <h2 className="text-4xl font-black text-destructive">¡ABANDONO! 🏃💨</h2>
            <p className="text-2xl font-bold">Tu compañero abandonó la partida.</p>
            <button onClick={handleExit} className="btn-notebook w-full text-2xl py-4 bg-primary hover:bg-primary/90">
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {over && !partnerLeft && (
        <div className="absolute inset-0 z-[50] flex items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-500">
          <div className="card-notebook p-12 max-w-xl w-full text-center space-y-8 transform animate-in zoom-in duration-300 shadow-2xl border-4 border-primary">
            <h2 className="text-7xl font-black text-primary tracking-tighter animate-bounce">
              SE TERMINÓ EL JUEGO
            </h2>
            
            <div className="space-y-4">
              <p className="text-3xl font-bold text-foreground">
                ¿Jugar de nuevo?
              </p>
              {partnerWantsRematch && !rematchRequested && (
                <p className="text-xl text-accent font-bold animate-pulse">
                  ¡Tu compañero quiere la revancha! ⚔️
                </p>
              )}
              {rematchRequested && !partnerWantsRematch && (
                <p className="text-xl text-muted-foreground italic">
                  Esperando respuesta de tu compañero... ⏳
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={handlePlayAgain}
                disabled={rematchRequested}
                className={`btn-notebook w-full text-3xl py-5 shadow-lg transition-all ${rematchRequested ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
              >
                {rematchRequested ? '✅ Esperando...' : '🔥 ¡REVANCHA!'}
              </button>
              
              <button 
                onClick={handleExit}
                className="btn-notebook w-full text-xl py-3 bg-secondary hover:bg-destructive hover:text-white transition-colors"
              >
                No, salir al inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
