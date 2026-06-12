import { supabase } from './supabase';

export function subscribeToChannel(
  table: string,
  callback?: (payload: any) => void
) {
  const subscription = supabase
    .channel(`table:${table}`)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table },
      (payload: any) => {
        if (callback) callback(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(subscription);
  };
}

export { supabase };
