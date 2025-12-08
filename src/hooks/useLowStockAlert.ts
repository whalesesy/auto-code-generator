import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const LOW_STOCK_THRESHOLD = 3;

export function useLowStockAlert() {
  const { role, user } = useAuth();

  useEffect(() => {
    if (role !== 'admin' || !user) return;

    const checkLowStock = async () => {
      // Fetch devices and their stock levels
      const { data: devices } = await supabase.from('devices').select('*');
      const { data: movements } = await supabase.from('stock_movements').select('*');

      if (!devices || !movements) return;

      // Calculate current stock for each device
      const lowStockDevices = devices.filter(device => {
        const deviceMovements = movements.filter(m => m.device_id === device.id);
        const stockIn = deviceMovements.filter(m => m.movement_type === 'in').reduce((acc, m) => acc + m.quantity, 0);
        const stockOut = deviceMovements.filter(m => m.movement_type === 'out').reduce((acc, m) => acc + m.quantity, 0);
        const currentStock = stockIn - stockOut;
        return currentStock > 0 && currentStock < LOW_STOCK_THRESHOLD;
      });

      if (lowStockDevices.length === 0) return;

      // Check if we've already sent a notification today for these devices
      const today = new Date().toISOString().split('T')[0];
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'warning')
        .gte('created_at', today)
        .ilike('title', '%Low Stock Alert%');

      // Only send if no notification sent today
      if (!existingNotifications || existingNotifications.length === 0) {
        const deviceNames = lowStockDevices.map(d => d.name).join(', ');
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Low Stock Alert',
          message: `The following devices have low stock (< ${LOW_STOCK_THRESHOLD}): ${deviceNames}`,
          type: 'warning',
        });
      }
    };

    // Check on mount and every 5 minutes
    checkLowStock();
    const interval = setInterval(checkLowStock, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [role, user]);
}

export async function checkAndNotifyLowStock(deviceId: string, adminIds: string[]) {
  const { data: device } = await supabase.from('devices').select('*').eq('id', deviceId).single();
  const { data: movements } = await supabase.from('stock_movements').select('*').eq('device_id', deviceId);

  if (!device || !movements) return;

  const stockIn = movements.filter(m => m.movement_type === 'in').reduce((acc, m) => acc + m.quantity, 0);
  const stockOut = movements.filter(m => m.movement_type === 'out').reduce((acc, m) => acc + m.quantity, 0);
  const currentStock = stockIn - stockOut;

  if (currentStock > 0 && currentStock < LOW_STOCK_THRESHOLD) {
    // Notify all admins
    const notifications = adminIds.map(adminId => ({
      user_id: adminId,
      title: 'Low Stock Alert',
      message: `${device.name} stock is now at ${currentStock} units (below ${LOW_STOCK_THRESHOLD})`,
      type: 'warning',
    }));

    await supabase.from('notifications').insert(notifications);
  }
}