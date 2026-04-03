import { useState, useEffect } from 'react';
import { User, updateProfile, getStats } from '@/lib/auth';

interface PlayerHubProps {
  user: User;
  onContinue: (updatedUser: User) => void;
  onLogout: () => void;
}

const SCENARIOS = [
  { id: 'rabbits', name: 'Territorio Conejo', icon: '🐰' },
  { id: 'pandas', name: 'Valle del Panda', icon: '🐼' }
];

const SKINS_BY_SCENARIO: Record<string, any[]> = {
  rabbits: [
    { id: 'rabbit-base', name: 'Conejo Clásico', img: '/siluetaconejo.png' },
    { id: 'rabbit-alt', name: 'Conejo Ninja', img: '/siluetados.png' },
    { id: 'rabbit-gold', name: 'Conejo Dorado', img: '/siluetaconejo.png', color: '#FFD700' },
    { id: 'rabbit-shadow', name: 'Conejo Sombrío', img: '/siluetados.png', color: '#333333' },
  ],
  pandas: [
    { id: 'panda-base', name: 'Panda Guerrero', img: '/pandas/panda.png' },
    { id: 'panda-alt', name: 'Panda Zen', img: '/pandas/panda2.png' },
    { id: 'panda-pro', name: 'Panda Maestro', img: '/pandas/panda3.png' },
  ]
};

const STRIPE_COLORS = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

const PlayerHub = ({ user, onContinue, onLogout }: PlayerHubProps) => {
  const [scenario, setScenario] = useState(user.scenario || 'rabbits');
  const [currentSkin, setCurrentSkin] = useState(user.skin || 'rabbit-base');
  const [stripeColor, setStripeColor] = useState(user.stripeColor || '#FF0000');
  const [stats, setStats] = useState(user);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Refresh stats
    getStats(user.username).then(data => {
      if (data) setStats(data);
    });
  }, [user.username]);

  // Si cambiamos escenario, ponemos un skin válido por defecto
  const handleScenarioChange = (newScenario: string) => {
    setScenario(newScenario);
    setCurrentSkin(SKINS_BY_SCENARIO[newScenario][0].id);
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await updateProfile(user.username, currentSkin, stripeColor, scenario);
    setSaving(false);
    if (success) {
      onContinue({ ...stats, skin: currentSkin, stripeColor, scenario });
    }
  };

  const applicableSkins = SKINS_BY_SCENARIO[scenario] || SKINS_BY_SCENARIO.rabbits;
  const selectedSkinData = applicableSkins.find(s => s.id === currentSkin) || applicableSkins[0];

  return (
    <div className="min-h-screen notebook-bg flex items-center justify-center p-4">
      <div className="card-notebook w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 p-8 shadow-2xl relative overflow-hidden">
        
        {/* Left Side: Customization */}
        <div className="space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-black text-foreground">HOLA, {user.username.toUpperCase()}! {scenario === 'rabbits' ? '🐰' : '🐼'}</h2>
            <p className="text-pencil-light text-xl italic font-bold">Configura tu aventura</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xl font-bold mb-4 text-pencil">🌍 Escenario:</label>
              <div className="flex gap-4">
                {SCENARIOS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleScenarioChange(s.id)}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all font-bold ${
                      scenario === s.id 
                        ? 'border-primary bg-primary/10 shadow-md' 
                        : 'border-pencil/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <span className="text-2xl block">{s.icon}</span>
                    <span className="text-xs">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xl font-bold mb-4 text-pencil">✨ Elige tu Combatiente:</label>
              <div className="grid grid-cols-2 gap-4 text-center">
                {applicableSkins.map(skin => (
                  <button
                    key={skin.id}
                    onClick={() => setCurrentSkin(skin.id)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      currentSkin === skin.id 
                        ? 'border-primary bg-primary/10 scale-105 shadow-md' 
                        : 'border-pencil/20 hover:border-primary/50 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
                    }`}
                  >
                    <img src={skin.img} alt={skin.name} className="w-16 h-16 object-contain" style={{ filter: skin.color ? `drop-shadow(0 0 4px ${skin.color})` : 'none' }} />
                    <span className="font-bold text-sm leading-tight">{skin.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xl font-bold mb-4 text-pencil">🎨 Color de tu Raya:</label>
              <div className="flex flex-wrap gap-3">
                {STRIPE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setStripeColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-10 h-10 rounded-full border-4 transition-transform hover:scale-125 shadow-sm ${
                      stripeColor === color ? 'border-foreground scale-110 ring-2 ring-primary' : 'border-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Preview & Stats */}
        <div className="flex flex-col justify-between space-y-8 bg-white/40 p-6 rounded-2xl border-2 border-dashed border-pencil/20">
          
          <div className="flex flex-col items-center">
             <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-75 group-hover:scale-100 transition-transform duration-700"></div>
                <div className="relative">
                  <img 
                    src={selectedSkinData.img} 
                    alt="Preview" 
                    className="w-48 h-48 object-contain scale-x-[-1] drop-shadow-2xl"
                    style={{ filter: selectedSkinData.color ? `drop-shadow(0 0 8px ${selectedSkinData.color})` : 'none' }}
                  />
                  {/* Simulating the "stripe" highlight */}
                  <div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-20 blur-md opacity-60 rounded-full"
                    style={{ backgroundColor: stripeColor, transform: 'translate(-50%, -50%) rotate(15deg)' }}
                  ></div>
                </div>
             </div>
             <p className="mt-4 text-2xl font-black text-primary tracking-widest">{selectedSkinData.name.toUpperCase()}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-center border-b-2 border-pencil/10 pb-2">📋 RESUMEN DE JUEGOS</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <span className="block text-3xl font-black text-primary">{stats.gamesPlayed}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase">Partidas</span>
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-black text-accent">{stats.wins}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase">Wins</span>
              </div>
              <div className="space-y-1">
                <span className="block text-3xl font-black text-destructive">{stats.losses}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase">Losses</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-notebook w-full text-2xl py-4 shadow-xl hover:translate-y-[-2px] active:translate-y-[2px]"
            >
              {saving ? 'Guardando...' : '🚀 ¡A LAS SALAS!'}
            </button>
            <button
              onClick={onLogout}
              className="w-full text-lg text-muted-foreground hover:text-destructive transition-colors font-bold underline decoration-dashed"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PlayerHub;
