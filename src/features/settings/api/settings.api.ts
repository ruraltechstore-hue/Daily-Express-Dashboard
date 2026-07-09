import { supabase } from '@/lib/supabase';

// For simplicity, we assume there is an app_settings table or similar. 
// If it doesn't exist, this provides a skeleton for how settings would work.

export async function fetchSettings() {
  // Try fetching from a generic settings table. 
  // If it doesn't exist in our schema yet, we'll return a mock for the UI.
  const { data, error } = await supabase
    .from('app_settings') // Assuming table exists or we fall back
    .select('*');

  if (error) {
    if (error.code === '42P01') {
      // Table doesn't exist, return defaults
      return {
        store_name: 'Daily Express',
        support_phone: '+91 98765 43210',
        support_email: 'support@dailyexpress.com',
        delivery_charge: 20,
        min_order_amount: 100,
        free_delivery_above: 500,
        accepting_orders: true,
      };
    }
    throw error;
  }

  // Convert row data into a key-value object
  const settingsObj = data.reduce((acc, row) => {
    acc[row.setting_key] = row.setting_value;
    return acc;
  }, {} as Record<string, any>);
  
  return {
    store_name: settingsObj.store_name || 'Daily Express',
    support_phone: settingsObj.support_phone || '',
    support_email: settingsObj.support_email || '',
    delivery_charge: Number(settingsObj.delivery_charge) || 0,
    min_order_amount: Number(settingsObj.min_order_amount) || 0,
    free_delivery_above: Number(settingsObj.free_delivery_above) || 0,
    accepting_orders: settingsObj.accepting_orders === 'true',
  };
}

export async function updateSettings(settings: Record<string, any>) {
  // Convert object to rows
  const updates = Object.keys(settings).map(key => ({
    setting_key: key,
    setting_value: String(settings[key]),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('app_settings')
    .upsert(updates, { onConflict: 'setting_key' });

  if (error) throw error;
  return settings;
}
