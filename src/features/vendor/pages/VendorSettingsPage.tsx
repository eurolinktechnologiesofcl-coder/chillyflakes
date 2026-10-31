import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Settings,
  Bell,
  Sun,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import { updateVendorSettings } from '../../../api/vendorPortalApi';

export const VendorSettingsPage: React.FC = () => {
  const toast = useToast();

  const [notifications, setNotifications] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(true);

  const settingsMutation = useMutation({
    mutationFn: updateVendorSettings,
    onSuccess: () => {
      toast.showToast('Portal settings updated successfully.', 'success');
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to update settings.', 'error');
    },
  });

  const handleSave = () => {
    settingsMutation.mutate({
      notifications,
      vacation_mode: vacationMode,
      auto_accept_orders: autoAcceptOrders,
    });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Portal Settings"
          description="Configure notification alerts, store availability, and automated order processing."
        />

        <Button
          variant="primary"
          size="md"
          onClick={handleSave}
          disabled={settingsMutation.isPending}
          leftIcon={<Save className="w-4 h-4" />}
        >
          {settingsMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Vacation / Holiday Mode */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#223B28]">Artisan Vacation Mode</h4>
                <p className="text-xs text-[#637365]">
                  Temporarily pause new customer orders while you are away or crafting batches.
                </p>
              </div>
            </div>

            <button
              onClick={() => setVacationMode(!vacationMode)}
              className="text-[#2E4D34] focus:outline-none"
            >
              {vacationMode ? (
                <ToggleRight className="w-9 h-9 text-[#2E4D34]" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-[#8E9B90]" />
              )}
            </button>
          </div>
          {vacationMode && (
            <div className="text-xs bg-amber-50/70 border border-amber-200 text-amber-900 p-3 rounded-xl">
              <strong>Notice:</strong> Your products will display as "Temporarily Crafting" to buyers. Existing placed orders must still be fulfilled on schedule.
            </div>
          )}
        </div>

        {/* Order Processing */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EAF1EA] text-[#2E4D34]">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#223B28]">Automatic Order Intake</h4>
                <p className="text-xs text-[#637365]">
                  Automatically accept in-stock orders and transition to "Pending Dispatch".
                </p>
              </div>
            </div>

            <button
              onClick={() => setAutoAcceptOrders(!autoAcceptOrders)}
              className="text-[#2E4D34] focus:outline-none"
            >
              {autoAcceptOrders ? (
                <ToggleRight className="w-9 h-9 text-[#2E4D34]" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-[#8E9B90]" />
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#EAF1EA] text-[#2E4D34]">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#223B28]">Email & In-App Alerts</h4>
                <p className="text-xs text-[#637365]">
                  Receive notifications for new orders, low inventory warnings, and weekly payout settlements.
                </p>
              </div>
            </div>

            <button
              onClick={() => setNotifications(!notifications)}
              className="text-[#2E4D34] focus:outline-none"
            >
              {notifications ? (
                <ToggleRight className="w-9 h-9 text-[#2E4D34]" />
              ) : (
                <ToggleLeft className="w-9 h-9 text-[#8E9B90]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorSettingsPage;
