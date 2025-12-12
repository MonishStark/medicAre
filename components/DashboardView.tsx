import React, { useEffect, useState } from 'react';
import { authService } from '../services/auth';

interface DashboardViewProps {
  onNavigate: () => void;
  onProfile: () => void;
  onAnalytics: () => void; // New prop
}

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onProfile, onAnalytics }) => {
  const [userName, setUserName] = useState('Jane');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // ... (keep useEffect same, omitted for brevity if using search/replace carefully, but here I am replacing the top block)
    const fetchData = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user.full_name) {
                setUserName(user.full_name.split(' ')[0]);
            }
            
            const appts = await authService.getAppointments();
            setAppointments(appts);

            const userStats = await authService.getStats();
            setStats(userStats);

        } catch (e) {
            console.error("Failed to fetch dashboard data");
        }
    };
    fetchData();
  }, []);

  const painHistory = stats?.pain_history ? stats.pain_history.split(',').map(Number) : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="min-h-screen bg-[#0a160e] text-white font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center border-b border-white/5 bg-[#0a160e]/95 backdrop-blur-md px-6 lg:px-12">
        <div className="flex items-center gap-2 mr-12">
             <div className="size-8 rounded-full bg-[#13ec5b] flex items-center justify-center">
                <span className="material-symbols-outlined text-black text-xl">check</span>
             </div>
             <h2 className="text-xl font-bold tracking-tight">PhysioVibe</h2>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <span className="text-white font-bold cursor-pointer">Dashboard</span>
            <span className="hover:text-white cursor-pointer transition-colors" onClick={onAnalytics}>Analytics</span>
            <span className="hover:text-white cursor-pointer transition-colors">Exercises</span>
            <span className="hover:text-white cursor-pointer transition-colors">Schedule</span>
        </nav>

        <div className="ml-auto flex items-center gap-6">
            <button className="material-symbols-outlined text-white/70 hover:text-white transition-colors">notifications</button>
            <div onClick={onProfile} className="size-9 rounded-full bg-gray-600 cursor-pointer overflow-hidden border border-white/20 hover:border-[#13ec5b] transition-all">
                {/* Placeholder Avatar */}
                 <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold">{userName[0]}</span>
                 </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-8">Good morning, {userName}!</h1>
        
        {/* Top Row: Hero + Appointments */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Hero Card */}
          <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-[#152e22] border border-white/5 shadow-2xl group">
             {/* Background Image Effect */}
             <div className="absolute inset-0 z-0 opacity-40 mix-blend-overlay">
                 <img src="https://img.freepik.com/free-vector/gradient-physiotherapy-illustration_23-2150338764.jpg" className="w-full h-full object-cover" alt="bg"/>
             </div>
             <div className="absolute inset-0 bg-gradient-to-r from-[#0f251b] via-[#0f251b]/90 to-transparent z-0"></div>

             <div className="relative z-10 p-8 flex flex-col justify-center h-full min-h-[300px]">
                <div className="max-w-md">
                     <h2 className="text-3xl font-bold mb-2">Today's Program: Week 2 Knee Strengthening</h2>
                     <p className="text-white/70 mb-8 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">fitness_center</span> 6 Exercises 
                        <span className="mx-2">•</span> 
                        <span className="material-symbols-outlined text-sm">schedule</span> Est. 25 minutes
                     </p>
                     
                     <button onClick={onNavigate} className="bg-[#13ec5b] text-black font-bold px-8 py-3 rounded-lg hover:bg-[#10c94d] transition-transform active:scale-95 shadow-[0_0_20px_rgba(19,236,91,0.3)]">
                       Start Session
                     </button>
                </div>
             </div>
          </div>
          
          {/* Upcoming Appointments */}
          <div className="bg-[#102216] rounded-2xl p-6 border border-white/5 flex flex-col">
            <h3 className="font-bold mb-6">Upcoming Appointments</h3>
            
            <div className="space-y-4 flex-1">
                {appointments.length === 0 ? (
                    <p className="text-white/30 text-sm">No upcoming appointments.</p>
                ) : (
                    appointments.map((appt) => (
                        <div key={appt.id} className="flex gap-4">
                            <div className="bg-[#13ec5b] text-black rounded-lg w-12 h-12 flex flex-col items-center justify-center font-bold leading-none flex-shrink-0">
                                <span className="text-[10px] uppercase">{appt.date_str.split(' ')[0]}</span>
                                <span className="text-lg">{appt.date_str.split(' ')[1]}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-sm">{appt.title}</h4>
                                <p className="text-xs text-white/50 mt-1">{appt.time_str} - {appt.type}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <button className="text-[#13ec5b] text-sm font-bold mt-6 hover:underline flex items-center gap-1">
                View full schedule <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>

        <h2 className="text-xl font-bold mb-6">My Progress</h2>

        {/* Middle Row: Progress Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            
            {/* Pain Level */}
            <div className="bg-[#102216] rounded-2xl p-6 border border-white/5">
                <p className="text-sm font-medium text-white/70 mb-4">Pain Level Over Time</p>
                <div className="flex items-end gap-1 mb-2">
                    <span className="text-5xl font-bold">{stats?.pain_level ?? 0}</span>
                    <span className="text-xl text-white/50 mb-1">/10</span>
                </div>
                <div className="flex items-center gap-1 text-[#13ec5b] text-xs font-bold mb-6">
                    <span className="material-symbols-outlined text-sm">trending_down</span>
                    <span>10% Last 30 Days</span>
                </div>
                 {/* Real Wavy SVG Chart */}
                <div className="h-16 w-full relative">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Gradient Defs */}
                        <defs>
                            <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.5"/>
                                <stop offset="100%" stopColor="#13ec5b" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        {/* Area Path */}
                        <path 
                            d={`M0,100 ${painHistory.map((h: number, i: number) => {
                                const x = (i / (painHistory.length - 1)) * 100;
                                const y = 100 - h; // Invert because SVG y=0 is top
                                return `L${x},${y}`;
                            }).join(' ')} L100,100 Z`}
                            fill="url(#painGradient)" 
                        />
                        {/* Line Path (Simple smooth approximation) */}
                         <path 
                            d={`M0,${100 - painHistory[0]} C20,${100 - painHistory[2]} 50,${100 - painHistory[5]} 100,${100 - painHistory[painHistory.length - 1]}`}
                            fill="none" 
                            stroke="#13ec5b" 
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
            </div>

            {/* Program Completion */}
            <div className="bg-[#102216] rounded-2xl p-6 border border-white/5">
                <p className="text-sm font-medium text-white/70 mb-4">Program Completion</p>
                 <div className="flex items-end gap-1 mb-6">
                    <span className="text-5xl font-bold">{stats?.program_completion ?? 0}%</span>
                </div>
                <div className="w-full bg-white/10 h-3 rounded-full mb-3 overflow-hidden">
                    <div className="bg-[#13ec5b] h-full rounded-full shadow-[0_0_10px_#13ec5b]" style={{width: `${stats?.program_completion ?? 0}%`}}></div>
                </div>
                <p className="text-xs text-white/50">3 out of 4 weeks completed</p>
            </div>

             {/* Adherence */}
             <div className="bg-[#102216] rounded-2xl p-6 border border-white/5">
                <p className="text-sm font-medium text-white/70 mb-4">Adherence</p>
                 <div className="flex items-end gap-1 mb-6">
                    <span className="text-5xl font-bold">{stats?.adherence_score ?? 0}%</span>
                </div>
                <div className="flex justify-between gap-2 mb-3">
                    {['M','T','W','T','F'].map((d, i) => (
                        <div key={i} className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 || i === 4 ? 'bg-[#13ec5b] text-black' : 'bg-white/10 text-white/50'}`}>
                            {d}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-white/50">Great consistency this month!</p>
            </div>
        </section>

        {/* Bottom Row */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#102216] rounded-2xl p-6 border border-white/5">
                <h3 className="font-bold mb-6">Recent Achievements</h3>
                <div className="flex justify-around">
                     <div className="flex flex-col items-center gap-2">
                        <div className="size-14 rounded-full bg-[#152e22] text-[#13ec5b] flex items-center justify-center border border-[#13ec5b]/30">
                            <span className="material-symbols-outlined">local_fire_department</span>
                        </div>
                        <span className="text-xs font-medium text-white/70">{stats?.streak_days ?? 0}-Day Streak</span>
                     </div>
                     <div className="flex flex-col items-center gap-2">
                        <div className="size-14 rounded-full bg-[#152e22] text-[#13ec5b] flex items-center justify-center border border-[#13ec5b]/30">
                            <span className="material-symbols-outlined">star</span>
                        </div>
                        <span className="text-xs font-medium text-white/70">First Program</span>
                     </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="size-14 rounded-full bg-[#152e22] text-white/30 flex items-center justify-center border border-white/10">
                            <span className="material-symbols-outlined">emoji_events</span>
                        </div>
                        <span className="text-xs font-medium text-white/30">Perfect Month</span>
                     </div>
                </div>
            </div>

            <div className="bg-[#102216] rounded-2xl p-6 border border-white/5 flex flex-col justify-center gap-4">
                 <h3 className="font-bold">Quick Access</h3>
                 
                 <button className="flex items-center gap-4 p-4 rounded-xl bg-[#152e22] hover:bg-[#1a382a] transition-colors group">
                    <span className="material-symbols-outlined text-white/70 group-hover:text-white">chat_bubble</span>
                    <span className="font-medium">Contact My Therapist</span>
                 </button>
                 
                 <button className="flex items-center gap-4 p-4 rounded-xl bg-[#152e22] hover:bg-[#1a382a] transition-colors group">
                    <span className="material-symbols-outlined text-white/70 group-hover:text-white">library_books</span>
                    <span className="font-medium">View Full Exercise Library</span>
                 </button>
            </div>
        </section>

      </main>
    </div>
  );
};

export default DashboardView;
