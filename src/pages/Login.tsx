import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Lock, Server, ShieldCheck, User } from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/apiService';

export function Login({ onLogin }: { onLogin: (user: any) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fill effect to ensure values are set if they somehow get cleared
  React.useEffect(() => {
    if (!username) setUsername('admin');
    if (!password) setPassword('admin123');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      console.log("[Login] Attempting login with:", { 
        username, 
        passwordLength: password.length,
        passwordPreview: password.substring(0, 2) + "..." 
      });
      const response = await apiService.login({ username, password });
      console.log("[Login] Success response:", response);
      onLogin(response.data.user);
      toast.success("Identity Verified", { description: "Session encrypted and authorized." });
    } catch (error: any) {
      console.error("[Login Error]", error);
      toast.error("Access Denied", { 
        description: error.response?.data?.message || "Check your network connection and credentials." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Visual Accents */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl border border-white/10 shadow-2xl mb-4 backdrop-blur-xl">
            <Server className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic uppercase underline decoration-indigo-500 decoration-4 underline-offset-4">Wholesale OS</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.4em]">Integrated Supply Chain Terminal</p>
        </div>

        <Card className="bg-slate-900/50 backdrop-blur-2xl border border-white/10 shadow-3xl rounded-3xl overflow-hidden">
          <CardHeader className="pb-2">
             <div className="flex items-center gap-2 mb-2">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Login</p>
             </div>
             <CardTitle className="text-2xl font-black text-white italic uppercase tracking-tight">Access Terminal</CardTitle>
             <CardDescription className="text-slate-400 font-medium font-mono text-xs">Awaiting authorization from primary server...</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Admin Username</label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input 
                    type="text" 
                    placeholder="admin" 
                    className="bg-slate-950/50 border-white/5 text-white pl-10 h-12 focus:border-indigo-500 transition-all font-mono"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-indigo-400 transition-colors" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="bg-slate-950/50 border-white/5 text-white pl-10 h-12 focus:border-indigo-500 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-14 bg-white hover:bg-indigo-500 hover:text-white text-slate-950 font-black text-sm uppercase tracking-[0.2em] transition-all rounded-xl shadow-xl shadow-indigo-900/20 active:scale-95"
                >
                  {isLoading ? "Validating..." : "Execute Entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Restricted to authorized wholesale personnel only
          </p>
          <p className="text-[9px] text-slate-800 font-medium mt-2">
            Build v1.0.4 - End-to-End Encryption Active
          </p>
        </div>
      </div>
    </div>
  );
}
