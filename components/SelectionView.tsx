import React from 'react';

// PASTE STITCH UI HERE

interface SelectionViewProps {
  onSelect: (activity: string) => void;
  onBack: () => void;
}

const activities = [
  { id: 'neck', name: 'Neck Rotation', duration: '5 mins', icon: 'accessibility_new' },
  { id: 'squat', name: 'Squats', duration: '10 mins', icon: 'fitness_center' },
  { id: 'hamstring', name: 'Hamstring Stretch', duration: '8 mins', icon: 'directions_run' },
  { id: 'shoulder', name: 'Shoulder Abduction', duration: '6 mins', icon: 'height' },
  { id: 'lunge', name: 'Lunges', duration: '12 mins', icon: 'downhill_skiing' },
  { id: 'plank', name: 'Plank', duration: '3 mins', icon: 'monitor_heart' }
];

const SelectionView: React.FC<SelectionViewProps> = ({ onSelect, onBack }) => {
  return (
    <div className="min-h-screen bg-background-dark text-white font-display p-6">
      <div className="max-w-4xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-white/60 hover:text-white mb-8">
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold mb-2">Select Activity</h1>
        <p className="text-white/60 mb-8">Choose an exercise to analyze your form.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((act) => (
            <button 
              key={act.id}
              onClick={() => onSelect(act.name)}
              className="flex flex-col items-start p-6 bg-surface-dark border border-border-dark rounded-xl hover:bg-[#23482f] hover:border-primary transition-all text-left group"
            >
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-background-dark transition-colors text-primary">
                <span className="material-symbols-outlined">{act.icon}</span>
              </div>
              <h3 className="text-xl font-bold mb-1">{act.name}</h3>
              <p className="text-sm text-white/50">{act.duration}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectionView;
