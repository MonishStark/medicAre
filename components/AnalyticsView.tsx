import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

interface AnalyticsViewProps {
  onNavigateDashboard: () => void;
  onNavigateAnalytics: () => void; // Self
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onNavigateDashboard, onNavigateAnalytics }) => {
  const [stats, setStats] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('Last 7 Days');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await authService.getStats();
        setStats(data);
      } catch (e) {
        console.error("Failed to load stats");
      }
    };
    fetchStats();
  }, []);

  const painLevel = stats?.pain_level ?? 0;
  const adherence = stats?.adherence_score ?? 0;
  const streak = stats?.streak_days ?? 0;
  // Use streak as proxy for sessions for now
  const totalSessions = streak; 

  return (
    <div className="min-h-screen bg-[#0a160e] text-white font-display">
       {/* Header (Shared with Dashboard) */}
       <header className="sticky top-0 z-50 flex h-16 items-center border-b border-white/5 bg-[#0a160e]/95 backdrop-blur-md px-6 lg:px-12">
        <div className="flex items-center gap-2 mr-12 cursor-pointer" onClick={onNavigateDashboard}>
             <div className="size-8 rounded-full bg-[#13ec5b] flex items-center justify-center">
                <span className="material-symbols-outlined text-black text-xl">check</span>
             </div>
             <h2 className="text-xl font-bold tracking-tight">PhysioVibe</h2>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <span className="hover:text-white cursor-pointer transition-colors" onClick={onNavigateDashboard}>Dashboard</span>
            <span className="text-white cursor-pointer" onClick={onNavigateAnalytics}>Analytics</span>
            <span className="hover:text-white cursor-pointer transition-colors">Exercises</span>
            <span className="hover:text-white cursor-pointer transition-colors">Schedule</span>
        </nav>

        <div className="ml-auto flex items-center gap-6">
            <button className="material-symbols-outlined text-white/70 hover:text-white transition-colors">notifications</button>
            <div className="size-9 rounded-full bg-gray-600 cursor-pointer overflow-hidden border border-white/20">
                 <div className="w-full h-full bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold">M</span>
                 </div>
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold">Progress & Analytics</h1>
            <button className="flex items-center gap-2 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors text-sm font-medium text-[#13ec5b]">
                <span className="material-symbols-outlined text-lg">download</span>
                Export Report
            </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {['Last 7 Days', 'Last 30 Days', 'All Time', 'Custom Range'].map(range => (
                <button 
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        timeRange === range 
                        ? 'bg-[#13ec5b] text-black' 
                        : 'bg-[#152e22] text-white/70 hover:bg-[#1a382a]'
                    }`}
                >
                    {range} {range === 'Custom Range' && <span className="material-symbols-outlined text-sm ml-1 align-text-bottom">calendar_today</span>}
                </button>
            ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Sessions */}
            <div className="bg-[#102216] p-6 rounded-2xl border border-white/5">
                <p className="text-white/70 text-sm font-medium mb-1">Total Sessions</p>
                <h3 className="text-5xl font-bold mb-2">{totalSessions}</h3>
                <p className="text-[#13ec5b] text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">arrow_upward</span> +2 from last week
                </p>
            </div>
            
            {/* Adherence */}
            <div className="bg-[#102216] p-6 rounded-2xl border border-white/5">
                <p className="text-white/70 text-sm font-medium mb-1">Average Adherence</p>
                <h3 className="text-5xl font-bold mb-2">{adherence}%</h3>
                 <p className="text-[#13ec5b] text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">arrow_upward</span> +5% from last week
                </p>
            </div>

            {/* Pain Level */}
            <div className="bg-[#102216] p-6 rounded-2xl border border-white/5">
                <p className="text-white/70 text-sm font-medium mb-1">Current Pain Level</p>
                <h3 className="text-5xl font-bold mb-2">{painLevel}<span className="text-2xl text-white/50">/10</span></h3>
                 <p className="text-red-400 text-xs font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">arrow_downward</span> -1pt from last week
                </p>
            </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Overall Progress (Line Chart) */}
            <div className="lg:col-span-2 bg-[#102216] p-6 rounded-2xl border border-white/5">
                <div className="flex items-baseline gap-4 mb-8">
                     <div>
                        <h3 className="text-lg font-bold">Overall Progress vs. Time</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-4xl font-bold">{adherence}%</span>
                            <span className="text-[#13ec5b] text-sm font-bold">Last 30 Days +0%</span>
                        </div>
                     </div>
                </div>
                
                {/* SVG Chart */}
                <div className="w-full h-64 relative">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 150" preserveAspectRatio="none">
                         <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#13ec5b" stopOpacity="0.2"/>
                                <stop offset="100%" stopColor="#13ec5b" stopOpacity="0"/>
                            </linearGradient>
                        </defs>
                        {/* Area */}
                        <path d="M0,150 L0,130 C50,125 100,110 150,100 C200,90 250,85 300,70 C350,55 400,20 400,20 L400,150 Z" fill="url(#chartGradient)" />
                        {/* Line */}
                        <path d="M0,130 C50,125 100,110 150,100 C200,90 250,85 300,70 C350,55 400,20 400,20" fill="none" stroke="#13ec5b" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    
                    {/* X-Axis Labels */}
                    <div className="flex justify-between text-xs text-white/30 mt-4 px-2">
                        <span>Wk 1</span>
                        <span>Wk 2</span>
                        <span>Wk 3</span>
                        <span>Wk 4</span>
                    </div>
                </div>
            </div>

            {/* Exercise Performance (Bar Chart) */}
            <div className="lg:col-span-1 bg-[#102216] p-6 rounded-2xl border border-white/5">
                <h3 className="text-lg font-bold mb-1">Exercise Performance</h3>
                 <div className="flex items-baseline gap-2 mb-8">
                    <span className="text-4xl font-bold">{stats?.program_completion ?? 0}%</span>
                    <span className="text-[#13ec5b] text-sm font-bold">Last 30 Days +5%</span>
                </div>

                <div className="h-64 flex items-end justify-between gap-2">
                    {/* Bar 1 */}
                    <div className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="w-full bg-[#1c3a29] rounded-t-lg relative group-hover:bg-[#13ec5b]/80 transition-colors h-[40%]"></div>
                        <span className="text-[10px] text-white/50 text-center leading-tight">Knee Flexion</span>
                    </div>
                     {/* Bar 2 */}
                    <div className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="w-full bg-[#1c3a29] rounded-t-lg relative group-hover:bg-[#13ec5b]/80 transition-colors h-[55%]"></div>
                        <span className="text-[10px] text-white/50 text-center leading-tight">Leg Raise</span>
                    </div>
                     {/* Bar 3 */}
                    <div className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="w-full bg-[#1c3a29] rounded-t-lg relative group-hover:bg-[#13ec5b]/80 transition-colors h-[30%]"></div>
                        <span className="text-[10px] text-white/50 text-center leading-tight">Quad Set</span>
                    </div>
                     {/* Bar 4 (Highlighted) */}
                    <div className="flex flex-col items-center gap-2 flex-1 group">
                        <div className="w-full bg-[#13ec5b] rounded-t-lg relative shadow-[0_0_15px_rgba(19,236,91,0.3)] h-[85%]"></div>
                        <span className="text-[10px] text-[#13ec5b] text-center leading-tight font-bold">Heel Slide</span>
                    </div>
                </div>
            </div>

        </div>

      </main>
    </div>
  );
};

export default AnalyticsView;
