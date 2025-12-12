
import React, { useState } from 'react';
import { authService } from '../services/auth';

// PASTE STITCH UI HERE

interface ProfileViewProps {
  onBack: () => void;
  onLogout: () => void;
}

// PASTE STITCH UI HERE

interface ProfileViewProps {
  onBack: () => void;
  onLogout: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState('Profile');
  
  // State for user data
  const [isLoading, setIsLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  // Placeholder state for fields not yet in DB
  const [dob, setDob] = useState(''); 
  const [gender, setGender] = useState('Female'); 
  const [phone, setPhone] = useState('');

  // Toast State
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    try {
        const full_name = `${firstName} ${lastName}`.trim();
        await authService.updateProfile({
            full_name,
            phone,
            dob,
            gender
        });
        
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000); // Hide after 3 seconds
    } catch (err) {
        console.error("Failed to save:", err);
        alert("Failed to save changes");
    }
  };

  // Fetch User Data on Mount
  React.useEffect(() => {
    const fetchUser = async () => {
        try {
            const user = await authService.getCurrentUser();
            
            // Split Full Name
            const parts = user.full_name ? user.full_name.split(' ') : ['User', ''];
            const first = parts[0];
            const last = parts.slice(1).join(' '); // Join the rest

            setFirstName(first);
            setLastName(last);
            setEmail(user.email);
            
            // Populate optional fields
            if (user.phone) setPhone(user.phone);
            if (user.dob) setDob(user.dob);
            if (user.gender) setGender(user.gender);
            
        } catch (err) {
            console.error("Failed to load profile:", err);
        } finally {
            setIsLoading(false);
        }
    };
    fetchUser();
  }, []);

  if (isLoading) {
      return <div className="min-h-screen bg-background-dark text-white flex justify-center items-center">Loading Profile...</div>;
  }

  const fullName = `${firstName} ${lastName}`.trim();

  return (
    <div className="min-h-screen bg-background-dark text-white font-display flex flex-col">
       {/* Top Navigation Bar */}
       <header className="flex h-16 items-center justify-between border-b border-white/10 bg-[#102216]/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onBack}>
             <span className="material-symbols-outlined text-primary text-2xl">spa</span>
             <h2 className="text-lg font-bold">PhysioVibe</h2>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
            <span className="hover:text-white cursor-pointer" onClick={onBack}>Dashboard</span>
            <span className="hover:text-white cursor-pointer">Exercises</span>
            <span className="hover:text-white cursor-pointer">Progress</span>
            <span className="hover:text-white cursor-pointer">Messages</span>
        </nav>

        <div className="flex items-center gap-4">
            <button className="material-symbols-outlined text-white/70 hover:text-white">notifications</button>
            <div className="size-8 rounded-full bg-gray-600 outline outline-2 outline-white/20"></div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full py-8 px-6 gap-8">
        
        {/* Left Sidebar */}
        <aside className="w-64 flex-shrink-0">
            <div className="flex items-center gap-3 mb-8">
                <div className="size-12 rounded-full bg-gray-600"></div>
                <div>
                    <h3 className="font-bold">{fullName || 'User'}</h3>
                    <p className="text-xs text-white/50">{email}</p>
                </div>
            </div>

            <nav className="space-y-2">
                {[
                    { name: 'Profile', icon: 'person' },
                    { name: 'Notifications', icon: 'notifications' },
                    { name: 'Account Security', icon: 'lock' },
                    { name: 'App Preferences', icon: 'settings' }
                ].map((item) => (
                    <button 
                        key={item.name}
                        onClick={() => setActiveTab(item.name)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            activeTab === item.name 
                            ? 'bg-[#193322] text-primary border-l-4 border-primary' 
                            : 'text-white/70 hover:bg-white/5'
                        }`}
                    >
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <span className="font-medium text-sm">{item.name}</span>
                    </button>
                ))}
            </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Profile</h1>
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="text-white/70 hover:text-white font-medium">Cancel</button>
                    <button onClick={handleSave} className="bg-primary text-background-dark font-bold px-6 py-2 rounded-lg hover:bg-[#0fd650]">
                        Save Changes
                    </button>
                </div>
            </div>

            {/* ... (rest of content) ... */}

            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-right-5">
                    <div className="bg-[#193322] border border-primary/50 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        <div>
                            <h4 className="font-bold text-sm">Success</h4>
                            <p className="text-xs text-white/70">Changes have been saved successfully.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* User Avatar Section */}
            <div className="flex items-center gap-6 mb-8">
                <div className="size-20 rounded-full bg-gray-600 outline outline-4 outline-[#193322]"></div>
                <div>
                    <h3 className="text-xl font-bold">{fullName || 'User'}</h3>
                    <p className="text-sm text-white/50 mb-3">{email}</p>
                </div>
                <button className="ml-auto px-4 py-2 rounded-lg bg-[#193322] hover:bg-[#23452e] text-sm font-medium border border-white/10">
                    Change Photo
                </button>
            </div>

            {/* Personal Info Form */}
            <div className="space-y-6">
                <section>
                    <h3 className="font-bold text-lg mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-primary font-medium">First Name</label>
                            <input 
                                type="text" 
                                value={firstName} 
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-medium">Last Name</label>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-primary font-medium">Date of Birth</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
                                    placeholder="MM/DD/YYYY"
                                    className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary" 
                                />
                                <span className="material-symbols-outlined absolute right-4 top-3.5 text-white/50">calendar_today</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-medium">Gender</label>
                             <div className="relative">
                                <select 
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary appearance-none text-white"
                                >
                                    <option>Female</option>
                                    <option>Male</option>
                                    <option>Other</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-4 top-3.5 text-white/50">expand_more</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-lg mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm text-primary font-medium">Email Address</label>
                            <input 
                                type="email" 
                                value={email} 
                                readOnly // Email is fetched from Auth, usually read-only
                                className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary opacity-70 cursor-not-allowed" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-medium">Phone Number</label>
                            <input 
                                type="tel" 
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="+1 (555) 000-0000"
                                className="w-full bg-[#0a160e] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-primary" 
                            />
                        </div>
                    </div>
                </section>

                 <section>
                    <h3 className="font-bold text-lg mb-4 text-[#ff4d4d]">Danger Zone</h3>
                    <div className="bg-[#1a0f0f] border border-[#ff4d4d]/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div>
                            <h4 className="font-bold text-white">Delete Account</h4>
                            <p className="text-sm text-white/50 mt-1">Once you delete your account, there is no going back. Please be certain.</p>
                        </div>
                        <button className="bg-[#ff4d4d] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#ff3333] transition-colors">
                            Delete Account
                        </button>
                    </div>
                     <div className="mt-4 flex justify-end">
                        <button onClick={onLogout} className="text-white/50 hover:text-white text-sm font-medium underline">
                            Log Out of Application
                        </button>
                     </div>
                </section>
            </div>
        </main>
      </div>

       {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 right-8 z-50 animate-bounce-in">
            <div className="bg-[#102216] border border-[#13ec5b] text-white px-6 py-4 rounded-xl shadow-[0_0_20px_rgba(19,236,91,0.2)] flex items-center gap-4">
                <div className="bg-[#13ec5b]/20 p-2 rounded-full">
                    <span className="material-symbols-outlined text-[#13ec5b]">check</span>
                </div>
                <div>
                    <h4 className="font-bold text-[#13ec5b]">Success</h4>
                    <p className="text-sm text-white/80">Changes have been saved.</p>
                </div>
                <button onClick={() => setShowToast(false)} className="ml-4 text-white/40 hover:text-white">
                    <span className="material-symbols-outlined text-sm">close</span>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
