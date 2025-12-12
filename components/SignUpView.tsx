import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authService } from '../services/auth';

// PASTE STITCH UI HERE

interface SignUpViewProps {
  onSignUp: () => void;
  onLogin: () => void;
}

const SignUpView: React.FC<SignUpViewProps> = ({ onSignUp, onLogin }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignUp = async () => {
      setError('');
      setIsLoading(true);
      try {
          // Register
          await authService.register(email, password, fullName);
          
          // Auto Login
          await authService.login(email, password);
          
          onSignUp();
      } catch (err: any) {
          setError(typeof err === 'string' ? err : 'Registration failed');
      } finally {
          setIsLoading(false);
      }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
        setIsGoogleLoading(true);
        try {
            await authService.googleLogin(tokenResponse.access_token);
            onSignUp();
        } catch (err) {
            console.error("Google Login Failed", err);
            setError("Google Login Failed");
        } finally {
            setIsGoogleLoading(false);
        }
    },
    onError: () => {
        setError("Google Login Failed");
    },
    flow: 'implicit'
  });

  const handleGoogleSignUp = () => {
    loginWithGoogle();
  };

  return (
    <div className="flex h-screen w-full bg-background-dark font-display">
      <div className="hidden lg:flex flex-col items-center justify-center relative w-1/2 h-full">
        <div className="absolute inset-0 bg-[#051109]/40 z-10"></div>
        <img 
            className="absolute inset-0 w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCNnc4AiZ8ldqBptBnprbok7NwnJ9262VfRpH78DbguELJOKfztA_PcPOX5r2nA1aZmr-FkHhDhixWcsDqXaJgOSMcb2eSBrmXrIOa9T4k8fRePwWCMaC4RCQA1Gy7mRI7ehC7cNiwCu5l-75HaRwOmPRfsyImN_YFFy8djkHWjK8fnn2sn8V2Zwxv2D29P-kQlMFW0wX3-S2hcvHtJNA-oaozaIxKITE67H5F7zKXzp-qUDkCW56kNRR5kyToIma2Gqc4IOH2roaA" 
            alt="Forest Path"
        />
        <div className="relative z-20 flex flex-col items-center text-white">
          <span className="material-symbols-outlined text-7xl text-white">spa</span>
          <h1 className="text-4xl font-bold mt-2">PhysioVibe</h1>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-background-dark">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div>
            <h1 className="text-white text-4xl font-bold">Create an account</h1>
            <h2 className="text-[#92c9a4] mt-2">Start your recovery journey today.</h2>
          </div>
          
          <div className="flex flex-col gap-4">
             <div className="flex flex-col gap-2">
              <label className="text-white font-medium">Full Name</label>
              <input 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-lg bg-transparent border border-[#326744] text-white p-4 focus:border-primary focus:ring-0 outline-none" 
                type="text" 
                placeholder="Enter your full name" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-medium">Email Address</label>
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg bg-transparent border border-[#326744] text-white p-4 focus:border-primary focus:ring-0 outline-none" 
                type="email" 
                placeholder="Enter your email" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-white font-medium">Password</label>
              <input 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-lg bg-transparent border border-[#326744] text-white p-4 focus:border-primary focus:ring-0 outline-none" 
                type="password" 
                placeholder="Create a password" 
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <div className="flex flex-col gap-4">
             <button 
                onClick={handleSignUp} 
                disabled={isLoading}
                className="w-full h-14 bg-primary text-background-dark rounded-lg font-bold text-lg hover:bg-[#0fd650] transition-colors disabled:opacity-50"
             >
              {isLoading ? "Signing Up..." : "Sign Up"}
            </button>
            <button 
                onClick={handleGoogleSignUp}
                disabled={isGoogleLoading}
                className="w-full h-14 bg-transparent border border-white/20 text-white rounded-lg font-bold flex items-center justify-center gap-3 hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
               {isGoogleLoading ? (
                 <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl">sync</span>
                    Connecting...
                </span>
               ) : (
                 <>
                    <span className="material-symbols-outlined text-xl">account_circle</span>
                    Sign up with Google
                </>
               )}
            </button>
          </div>
          
          <p className="text-center text-white/60">
            Already have an account? 
            <button 
                onClick={onLogin} 
                className="text-primary cursor-pointer hover:underline ml-1 font-bold bg-transparent border-none p-0 focus:outline-none"
            >
                Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUpView;
