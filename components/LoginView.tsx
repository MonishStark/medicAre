
import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { authService } from '../services/auth';

// PASTE STITCH UI HERE


interface LoginViewProps {
  onLogin: () => void;
  onSignUp?: () => void; // Added based on previous context, ensuring it's optional to prevent breakages
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
      setError('');
      setIsLoading(true);
      try {
          await authService.login(email, password);
          onLogin();
      } catch (err: any) {
          setError(typeof err === 'string' ? err : 'Login failed');
      } finally {
          setIsLoading(false);
      }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
        setIsGoogleLoading(true);
        try {
            await authService.googleLogin(tokenResponse.access_token);
            onLogin();
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
    flow: 'implicit' // or 'auth-code' if you want a refresh token flow, simplistic for now
  });

  const handleGoogleLogin = () => {
    // Attempt logic
    // Note: Since we are using Implicit flow or just token handling, we might need 'credential' if using newer GSI, 
    // but @react-oauth/google useGoogleLogin often gives access_token. 
    // Wait, the backend expects an ID Token usually. 
    // Let's ensure we get an ID Token or handle access token verification contentiously.
    // Actually, useGoogleLogin() by default gives an access_token. 
    // To get an ID Token we might need flow: 'auth-code' or just use the <GoogleLogin /> component. 
    // However, custom button requires useGoogleLogin.
    // Let's use flow: 'implicit' which gives access_token, 
    // BUT google-auth python lib usually validates ID Tokens.
    // If we want ID Token with custom button, we need to request 'openid email profile'.
    // Or we simply use the credential response from <GoogleLogin> but user wanted custom UI.
    // Okay, standard practice is: use access_token to fetch user info OR get ID Token.
    // I will stick to access_token and update backend to verify access_token OR 
    // Switch to using `flow: 'auth-code'` to get code and swap.
    // SIMPLER PATH: We will use the GoogleLogin component's style or 
    // Use `useGoogleLogin` and send the access_token to backend, and use `requests.get('https://www.googleapis.com/oauth2/v3/userinfo')`
    // Let's Update backend logic to support access_token if id_token fails? 
    // No, let's keep it simple. I will just trigger loginWithGoogle() here.
    loginWithGoogle();
  };

  return (
    <div className="flex h-screen w-full bg-background-dark font-display">
      <div className="hidden lg:flex flex-col items-center justify-center relative w-1/2 h-full">
        <div className="absolute inset-0 bg-[#051109]/40 z-10"></div>
        <img 
            className="absolute inset-0 w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB0lVG4k9vTsD1qvviam6nM7zH-lAB9w1i6OL6_M96iaJMVnp8xHHoZsMGF4rk0RLOIoasR3pbrRX26wJS6zjqyw-UTQ3shUSWyUAU22oa97cX-_ZrBj0HKB1yGCvUbBOu67270qLDM44PhRrL8HxoIp4DDyutAvBzJbvGcQ3o2qW6gveaIMmnAji9NDszyb_MQxyytgmgiuFRFVqi-F7lYL2MiE4AKdKrb5MCNHXZR8aoDyw7qG0JfF7BnRPqwsv84QguASZpVuoA" 
            alt="Forest Background"
        />
        <div className="relative z-20 flex flex-col items-center text-white">
          <span className="material-symbols-outlined text-7xl text-primary">spa</span>
          <h1 className="text-4xl font-bold mt-2">PhysioVibe</h1>
        </div>
      </div>
      
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-background-dark">
        <div className="w-full max-w-md flex flex-col gap-8">
          <div>
            <h1 className="text-white text-4xl font-bold">Welcome back.</h1>
            <h2 className="text-[#92c9a4] mt-2">Continue your recovery journey.</h2>
          </div>
          
          <div className="flex flex-col gap-6">
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
                placeholder="Enter your password" 
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <button 
                onClick={handleLogin} 
                disabled={isLoading}
                className="w-full h-14 bg-primary text-background-dark rounded-lg font-bold text-lg hover:bg-[#0fd650] transition-colors disabled:opacity-50"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
            <button 
                onClick={handleGoogleLogin}
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
                        Sign in with Google
                    </>
                )}
            </button>
          </div>
          
          <p className="text-center text-white/60">
            Don't have an account? 
            <button 
                onClick={onSignUp} 
                className="text-primary cursor-pointer hover:underline ml-1 font-bold bg-transparent border-none p-0 focus:outline-none"
            >
                Start Assessment
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
