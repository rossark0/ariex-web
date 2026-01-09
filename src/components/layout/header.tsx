'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth/AuthStore';
import { Button } from '@/components/ui/button';

export default function Header() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <div className="flex w-full items-center justify-between py-4">
      <div className="font-semibold">Ariex AI</div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-medium text-zinc-900">{user.name}</div>
          <div className="text-xs text-zinc-500">{user.role}</div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="sm"
          className="border-zinc-300 text-zinc-700 hover:bg-zinc-100"
        >
          Logout
        </Button>
      </div>
    </div>
  );
}
