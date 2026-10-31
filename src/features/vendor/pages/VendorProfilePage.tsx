import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Store,
  MapPin,
  CreditCard,
  Save,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import {
  getVendorProfile,
  updateVendorProfile,
} from '../../../api/vendorPortalApi';

export const VendorProfilePage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: getVendorProfile,
  });

  // Local form states
  const [storeName, setStoreName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [businessType, setBusinessType] = useState('individual');
  const [phone, setPhone] = useState('');
  const [pan, setPan] = useState('');
  const [taxId, setTaxId] = useState('');
  const [wholesaleEnabled, setWholesaleEnabled] = useState(false);

  // Address
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Bank
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Sync state when profile loads
  useEffect(() => {
    if (profile) {
      setStoreName(profile.store_name || '');
      setLegalName(profile.legal_name || '');
      setBusinessType(profile.business_type || 'individual');
      setPhone(profile.phone || '');
      setPan(profile.pan || '');
      setTaxId(profile.tax_id || '');
      setWholesaleEnabled(profile.wholesale_enabled || false);

      const addr = profile.pickup_address || {};
      setLine1(addr.line1 || addr.street || '');
      setCity(addr.city || '');
      setState(addr.state || '');
      setPincode(addr.pincode || '');

      const bank = profile.bank_info || {};
      setAccountHolder(bank.account_holder_name || profile.legal_name || '');
      setBankName(bank.bank_name || '');
      setAccountNumber(bank.account_number || '');
      setIfscCode(bank.ifsc_code || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: updateVendorProfile,
    onSuccess: (res) => {
      toast.showToast(res.message || 'Store profile saved successfully!', 'success');
      void queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to update store profile.', 'error');
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase())) {
      toast.showToast('Invalid PAN format (e.g. ABCDE1234F).', 'error');
      return;
    }
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.toUpperCase())) {
      toast.showToast('Invalid IFSC format (e.g. HDFC0001234).', 'error');
      return;
    }

    updateMutation.mutate({
      store_name: storeName,
      legal_name: legalName,
      business_type: businessType,
      phone,
      pan: pan.toUpperCase(),
      tax_id: taxId.toUpperCase(),
      wholesale_enabled: wholesaleEnabled,
      pickup_address: { line1, city, state, pincode, country: 'India' },
      bank_info: {
        account_holder_name: accountHolder,
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_code: ifscCode.toUpperCase(),
      },
    });
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2E4D34] mb-3" />
        <p className="text-xs font-medium text-[#637365]">Loading artisan store profile...</p>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Store Profile & Verification"
          description="Manage your artisan brand identity, pickup hub, and bank settlements."
        />

        <div className="flex items-center gap-3">
          <StatusBadge
            status={
              profile?.status === 'approved'
                ? 'approved'
                : profile?.status === 'under_review'
                ? 'pending_review'
                : profile?.status === 'rejected' || profile?.status === 'suspended'
                ? 'danger'
                : 'approved'
            }
            label={profile?.status?.replace('_', ' ') || 'Approved'}
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Identity */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-3">
            <Store className="w-5 h-5 text-[#2E4D34]" />
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Artisan Brand & Business Identity
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Store / Brand Name *</label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Legal Owner Name *</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Business Structure</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              >
                <option value="individual">Individual Artisan / Sole Proprietor</option>
                <option value="small_business">Registered Small Enterprise (MSME)</option>
                <option value="registered_company">Private Limited / LLP</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Support Mobile Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                placeholder="ABCDE1234F"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] font-mono focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">GSTIN (Optional for exempt crafts)</label>
              <input
                type="text"
                placeholder="32AAAAA0000A1Z5"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] font-mono focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pickup & Shipping Hub */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-3">
            <MapPin className="w-5 h-5 text-[#2E4D34]" />
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Dispatch Hub & Pickup Address
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="font-semibold text-[#4F5E51] block mb-1">Street Address / Workshop Studio</label>
              <input
                type="text"
                placeholder="e.g. 12/4 Artisan Lane, Spice Hills"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Postal PIN Code</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Verified Bank Account for Payouts */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-[#FAF7F2] pb-3">
            <CreditCard className="w-5 h-5 text-[#2E4D34]" />
            <h3 className="font-serif text-base font-bold text-[#223B28]">
              Settlement Bank Account
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Account Holder Name *</label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Bank Name *</label>
              <input
                type="text"
                placeholder="e.g. State Bank of India, HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">Account Number *</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] font-mono focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>

            <div>
              <label className="font-semibold text-[#4F5E51] block mb-1">IFSC Code *</label>
              <input
                type="text"
                placeholder="SBIN0001234"
                maxLength={11}
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] font-mono focus:ring-1 focus:ring-[#2E4D34]"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default VendorProfilePage;
