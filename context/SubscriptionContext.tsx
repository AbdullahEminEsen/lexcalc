import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchSubscription, getSubscriptionStatus, type Subscription } from '../lib/subscription';
import { supabase } from '../lib/supabase';

interface SubscriptionContextType {
  sub: Subscription | null;
  subscription: Subscription | null;
  loading: boolean;
  premium: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  daysLeft: number;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  sub: null, subscription: null, loading: true,
  premium: false, isPremium: false, isTrialActive: false,
  daysLeft: 0, refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await fetchSubscription();
    setSub(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => refresh());
    return () => data.subscription.unsubscribe();
  }, []);

  const { isPremium, isTrialActive, daysLeft } = getSubscriptionStatus(sub);

  return (
    <SubscriptionContext.Provider value={{
      sub,
      subscription: sub,
      loading,
      premium: isPremium,
      isPremium,
      isTrialActive,
      daysLeft,
      refresh,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
