import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from './supabase';

export interface Subscription {
  status: 'trial' | 'active' | 'expired' | 'cancelled' | 'pending_payment';
  plan: 'monthly' | 'yearly';
  trial_ends_at: string | null;
  current_period_end: string | null;
}

export interface SubscriptionState {
  subscription: Subscription | null;
  loading: boolean;
  isPremium: boolean;
  isTrialActive: boolean;
  daysLeft: number;
}

export function getSubscriptionStatus(sub: Subscription | null): {
  isPremium: boolean;
  isTrialActive: boolean;
  daysLeft: number;
} {
  if (!sub) return { isPremium: false, isTrialActive: false, daysLeft: 0 };

  const now = new Date();

  if (sub.status === 'active' && sub.current_period_end) {
    const end = new Date(sub.current_period_end);
    if (end > now) {
      return { isPremium: true, isTrialActive: false, daysLeft: 0 };
    }
  }

  if (sub.status === 'trial' && sub.trial_ends_at) {
    const trialEnd = new Date(sub.trial_ends_at);
    if (trialEnd > now) {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { isPremium: true, isTrialActive: true, daysLeft };
    }
  }

  return { isPremium: false, isTrialActive: false, daysLeft: 0 };
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', session.user.id)
    .single();
  return data as Subscription | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await fetchSubscription();
    setSubscription(data);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const { isPremium, isTrialActive, daysLeft } = getSubscriptionStatus(subscription);

  return { subscription, loading, isPremium, isTrialActive, daysLeft, refresh };
}
