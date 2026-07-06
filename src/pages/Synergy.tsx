import { useEffect, useState } from 'react';
import { useDate } from '../contexts/DateContext';
import { auth } from '../lib/firebase';

export default function Synergy() {
  const { endDate } = useDate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (auth.currentUser) {
        const t = await auth.currentUser.getIdToken();
        setToken(t);
      } else {
        setToken(sessionStorage.getItem('token') || '');
      }
    };
    fetchToken();
  }, []);

  if (token === null) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-mint"></div>
      </div>
    );
  }

  // Use endDate as the target date to sync with the dashboard's current selection
  const targetDate = endDate;
  const baseUrl = "https://synergy-board.web.app/";
  const iframeSrc = `${baseUrl}?date=${targetDate}&token=${token}`;

  return (
    <div className="w-full h-full min-h-screen flex flex-col">
      <iframe
        src={iframeSrc}
        className="flex-1 w-full h-full border-none"
        title="시너지"
        allowFullScreen
      />
    </div>
  );
}
