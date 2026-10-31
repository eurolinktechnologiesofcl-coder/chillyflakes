import React, { useState } from 'react';
import {
  X,
  Store,
  Eye,
  CheckCircle2,
  Clock,
  FileText,
  Building,
  MapPin,
  CreditCard,
  History,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useAdminSellerDetail, useAdminSellerMutations } from '../hooks/useAdminSellers';
import { usePermission } from '../hooks/usePermission';
import { useToast } from '../../../components/vendor/Toast';
import { ConfirmDialog } from '../../../components/vendor/ConfirmDialog';
import { Skeleton } from '../../../components/vendor/Skeleton';
import type { SellerKycDocument } from '../../../types/admin';

interface AdminSellerReviewModalProps {
  sellerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminSellerReviewModal: React.FC<AdminSellerReviewModalProps> = ({
  sellerId,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const { isSuperAdmin, canDecide, currentAdmin } = usePermission();

  const isVerifierOrSuperAdmin =
    isSuperAdmin ||
    currentAdmin?.role_name === 'Seller Verifier' ||
    currentAdmin?.role_id === 'role_seller_verifier' ||
    canDecide('sellers');

  const { data: seller, isLoading, isError, refetch } = useAdminSellerDetail(sellerId);
  const {
    verifyDocument,
    isVerifyingDoc,
    rejectDocument,
    isRejectingDoc,
    markUnderReview,
    isMarkingUnderReview,
    approveSeller,
    isApproving,
    requestResubmit,
    isRequestingResubmit,
    rejectSeller,
    suspendSeller,
    reactivateSeller,
    revealField,
    isRevealing,
  } = useAdminSellerMutations();

  // Document rejection modal state
  const [rejectingDoc, setRejectingDoc] = useState<SellerKycDocument | null>(null);
  const [docRejectReason, setDocRejectReason] = useState('');

  // Lightbox preview for documents
  const [previewDoc, setPreviewDoc] = useState<SellerKycDocument | null>(null);

  // Revealed sensitive fields
  const [revealedFields, setRevealedFields] = useState<Record<string, string>>({});

  // Decision state
  const [decisionNotes, setDecisionNotes] = useState('');
  const [flaggedSections, setFlaggedSections] = useState<string[]>([]);
  const [actionConfirm, setActionConfirm] = useState<'approve' | 'reject' | 'suspend' | 'reactivate' | null>(null);

  const isPdfDoc = (doc: SellerKycDocument) =>
    doc.mime_type === 'application/pdf' || /\.pdf$/i.test(doc.file_url || doc.file_name || '');

  // Reveal handler
  const handleReveal = async (field: 'tax_id' | 'pan' | 'bank_account') => {
    try {
      const res = await revealField({ sellerId, field });
      setRevealedFields((prev) => ({ ...prev, [field]: res.value }));
      toast.info(`Sensitive ${field.replace('_', ' ').toUpperCase()} view was logged in the audit trail.`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not reveal sensitive field.');
    }
  };

  // Doc verify handler
  const handleVerifyDoc = async (doc: SellerKycDocument) => {
    try {
      await verifyDocument({ sellerId, docId: doc.id });
      toast.success(`${doc.title} marked as verified.`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to verify document.');
    }
  };

  // Doc reject handler
  const handleRejectDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDoc || !docRejectReason.trim()) return;

    try {
      await rejectDocument({ sellerId, docId: rejectingDoc.id, reason: docRejectReason.trim() });
      toast.info(`${rejectingDoc.title} has been marked as rejected.`);
      setRejectingDoc(null);
      setDocRejectReason('');
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject document.');
    }
  };

  // Mark under review
  const handlePickUpReview = async () => {
    try {
      await markUnderReview(sellerId);
      toast.info(`Merchant review assigned to ${currentAdmin?.name || 'you'}.`);
      refetch();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update review status.');
    }
  };

  // Decision: Request Resubmit
  const handleRequestResubmit = async () => {
    if (!decisionNotes.trim() || decisionNotes.trim().length < 10) {
      toast.error('Please provide detailed feedback (at least 10 characters) explaining what needs correction.');
      return;
    }
    if (flaggedSections.length === 0) {
      toast.error('Please tick at least one section that requires seller changes.');
      return;
    }

    try {
      await requestResubmit({
        sellerId,
        reason: decisionNotes.trim(),
        flagged_sections: flaggedSections,
      });
      toast.warning('Feedback and flagged sections have been sent to the merchant.');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to request resubmission.');
    }
  };

  // Execute confirmed decision
  const executeConfirmedAction = async () => {
    if (!actionConfirm) return;

    try {
      if (actionConfirm === 'approve') {
        await approveSeller({ sellerId, reason: decisionNotes.trim() || undefined });
        toast.success(`${seller?.store_name} is now approved to sell on ChillyFlakes.`);
      } else if (actionConfirm === 'reject') {
        if (!decisionNotes.trim()) {
          toast.error('Please state the reason for rejecting this merchant.');
          return;
        }
        await rejectSeller({ sellerId, reason: decisionNotes.trim() });
        toast.info(`${seller?.store_name} application has been rejected.`);
      } else if (actionConfirm === 'suspend') {
        if (!decisionNotes.trim()) {
          toast.error('Please state the reason for suspending this merchant.');
          return;
        }
        await suspendSeller({ sellerId, reason: decisionNotes.trim() });
        toast.warning(`${seller?.store_name} has been suspended.`);
      } else if (actionConfirm === 'reactivate') {
        await reactivateSeller({ sellerId, reason: decisionNotes.trim() || undefined });
        toast.success(`${seller?.store_name} store access has been restored.`);
      }
      setActionConfirm(null);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to execute decision.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full border border-[#EAE5DB] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scaleUp">
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-[#EAE5DB] bg-[#FDFCF9] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#223B28]">
                  {seller?.store_name || 'Merchant Application'}
                </h2>
                {seller && (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      seller.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : seller.status === 'under_review'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : seller.status === 'resubmission_requested'
                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                        : seller.status === 'suspended'
                        ? 'bg-red-50 text-red-800 border-red-200'
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                    }`}
                  >
                    {seller.status.replace('_', ' ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8E9B90] mt-0.5">
                {seller?.legal_name} • Store Slug: <span className="font-mono text-[11px] text-[#223B28]">/{seller?.store_slug}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#8E9B90] hover:text-[#223B28] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY (Scrollable content) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-[#223B28]">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : isError || !seller ? (
            <div className="p-8 text-center text-xs text-red-600">
              Failed to load merchant details. Please verify the ID or try again.
            </div>
          ) : (
            <>
              {/* Reviewer banner */}
              {seller.status === 'under_review' && (
                <div className="bg-[#FAF3E0] border border-[#F3E2B8] rounded-2xl p-3 flex items-center justify-between text-xs text-[#8A5A00]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8A5A00]" />
                    <span>
                      Review assigned to: <strong>{seller.assigned_reviewer || 'Unassigned'}</strong> (In review for {seller.days_in_current_status} days)
                    </span>
                  </div>
                  {!seller.assigned_reviewer && isVerifierOrSuperAdmin && (
                    <button
                      type="button"
                      onClick={handlePickUpReview}
                      disabled={isMarkingUnderReview}
                      className="px-3 py-1 rounded-xl bg-amber-200/80 text-amber-900 font-semibold hover:bg-amber-300"
                    >
                      Assign to Me
                    </button>
                  )}
                </div>
              )}

              {/* 1. BUSINESS DETAILS */}
              <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#F0EDE6] pb-2 text-xs font-bold text-[#223B28] uppercase tracking-wider">
                  <Building className="w-4 h-4 text-[#2E4D34]" />
                  <span>Business & Contact Information</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Legal Entity Name
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block">{seller.legal_name}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Business Structure
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block capitalize">
                      {seller.business_type.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Wholesale Enabled
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block">
                      {seller.wholesale_enabled ? 'Yes (Accepts B2B Orders)' : 'No (Retail Only)'}
                    </span>
                  </div>

                  {/* Tax ID / GSTIN with Logged Reveal */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      GSTIN / Tax ID
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-xs">
                        {revealedFields['tax_id'] || seller.tax_id_masked}
                      </span>
                      {!revealedFields['tax_id'] && (
                        <button
                          type="button"
                          onClick={() => handleReveal('tax_id')}
                          disabled={isRevealing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#D1DDD0] hover:bg-[#FAF7F2] text-[10px] font-semibold text-[#2E4D34]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Reveal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* PAN with Logged Reveal */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Permanent Account Number (PAN)
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-xs">
                        {revealedFields['pan'] || seller.pan_masked}
                      </span>
                      {!revealedFields['pan'] && (
                        <button
                          type="button"
                          onClick={() => handleReveal('pan')}
                          disabled={isRevealing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#D1DDD0] hover:bg-[#FAF7F2] text-[10px] font-semibold text-[#2E4D34]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Reveal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Contact Person
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block">{seller.contact_person}</span>
                    <span className="text-[11px] text-[#5F6D61] block">{seller.email} • {seller.phone}</span>
                  </div>
                </div>

                {/* Pickup Address */}
                <div className="pt-3 border-t border-[#F0EDE6] flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#8E9B90] mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Registered Pickup Warehouse Address
                    </span>
                    <p className="text-xs text-[#5F6D61] mt-0.5 leading-relaxed">
                      {seller.pickup_address.line1}
                      {seller.pickup_address.line2 ? `, ${seller.pickup_address.line2}` : ''},{' '}
                      {seller.pickup_address.city}, {seller.pickup_address.state} -{' '}
                      <strong>{seller.pickup_address.pincode}</strong> ({seller.pickup_address.country})
                    </p>
                  </div>
                </div>

                {/* Declared Categories */}
                <div className="pt-3 border-t border-[#F0EDE6]">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90] mb-1.5">
                    Declared Merchandising Categories
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {seller.declared_categories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF1EA] text-[#2E4D34] border border-[#D1DDD0]"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. KYC DOCUMENTS */}
              <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#F0EDE6] pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#223B28] uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#2E4D34]" />
                    <span>KYC & Compliance Documents</span>
                  </div>
                  <span className="text-xs font-bold text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-0.5 rounded-full">
                    {seller.documents.filter((d) => d.status === 'verified').length} of {seller.documents.length} Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {seller.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-[#F0EDE6] bg-[#FDFCF9] space-y-2 hover:border-[#D1DDD0] transition-colors"
                    >
                      {/* Thumbnail — click to open full preview */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="block w-full h-40 rounded-lg overflow-hidden border border-[#EAE5DB] bg-white hover:ring-2 hover:ring-[#2E4D34]/40 transition"
                        title="Click to view full document"
                      >
                        {isPdfDoc(doc) ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#2E4D34] gap-1">
                            <FileText className="w-10 h-10" />
                            <span className="text-[11px] font-semibold">PDF — click to view</span>
                          </div>
                        ) : (
                          <img src={doc.file_url} alt={doc.title} className="w-full h-full object-contain bg-[#FAF7F2]" loading="lazy" />
                        )}
                      </button>

                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#223B28]">{doc.title}</span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                doc.status === 'verified'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : doc.status === 'rejected'
                                  ? 'bg-red-50 text-red-800 border-red-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {doc.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#8E9B90] mt-0.5">
                            {doc.file_name} • {(doc.file_size_bytes / 1024).toFixed(0)} KB
                          </p>
                        </div>

                        {/* Open original in new tab */}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[#5F6D61] hover:text-[#2E4D34] hover:bg-[#FAF7F2] rounded-lg transition-colors"
                          title="Open original in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>

                      {doc.rejection_reason && (
                        <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                          <strong>Rejection reason:</strong> {doc.rejection_reason}
                        </p>
                      )}

                      {/* Per-document decision buttons */}
                      {isVerifierOrSuperAdmin && (
                        <div className="pt-2 border-t border-[#F0EDE6] flex items-center justify-end gap-2">
                          {doc.status !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyDoc(doc)}
                              disabled={isVerifyingDoc}
                              className="px-2.5 py-1 rounded-lg bg-[#EAF1EA] text-[#2E4D34] hover:bg-[#D8E6D7] text-[11px] font-semibold transition-colors"
                            >
                              Mark Verified
                            </button>
                          )}
                          {doc.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingDoc(doc);
                                setDocRejectReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-semibold transition-colors"
                            >
                              Reject Document
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. BANK DETAILS */}
              <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-[#F0EDE6] pb-2 text-xs font-bold text-[#223B28] uppercase tracking-wider">
                  <CreditCard className="w-4 h-4 text-[#2E4D34]" />
                  <span>Settlement Bank Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Account Holder Name
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block">
                      {seller.bank_info.account_holder_name}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Bank & Branch
                    </span>
                    <span className="font-semibold text-xs text-[#223B28] mt-0.5 block">
                      {seller.bank_info.bank_name} ({seller.bank_info.branch})
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      IFSC Code
                    </span>
                    <span className="font-mono font-semibold text-xs text-[#223B28] mt-0.5 block">
                      {seller.bank_info.ifsc_code}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      Account Number
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-semibold text-xs">
                        {revealedFields['bank_account'] || seller.bank_info.account_number_masked}
                      </span>
                      {!revealedFields['bank_account'] && (
                        <button
                          type="button"
                          onClick={() => handleReveal('bank_account')}
                          disabled={isRevealing}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#D1DDD0] hover:bg-[#FAF7F2] text-[10px] font-semibold text-[#2E4D34]"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Reveal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                      PAN Name Match Verification
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {seller.bank_info.holder_matches_pan ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Account holder name exactly matches registered PAN card name
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Name mismatch detected between Bank and PAN records
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. REVIEW HISTORY TIMELINE */}
              {seller.review_history && seller.review_history.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 border-b border-[#F0EDE6] pb-2 text-xs font-bold text-[#223B28] uppercase tracking-wider">
                    <History className="w-4 h-4 text-[#2E4D34]" />
                    <span>Audit Review Timeline</span>
                  </div>

                  <div className="space-y-3">
                    {seller.review_history.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-[#2E4D34] mt-1.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-[#223B28]">
                            {log.action.replace('_', ' ').toUpperCase()} by{' '}
                            <span className="text-[#2E4D34]">{log.reviewer_name}</span>
                          </p>
                          {log.notes && <p className="text-[11px] text-[#5F6D61] mt-0.5">{log.notes}</p>}
                          {log.flagged_sections && log.flagged_sections.length > 0 && (
                            <p className="text-[10px] text-amber-800 mt-0.5">
                              Flagged sections: {log.flagged_sections.join(', ')}
                            </p>
                          )}
                          <span className="text-[10px] text-[#8E9B90]">
                            {new Date(log.created_at).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* DECISION BAR FOOTER */}
        {seller && isVerifierOrSuperAdmin && (
          <div className="p-5 border-t border-[#EAE5DB] bg-[#FAF7F2] space-y-4 shrink-0">
            {/* Feedback / Decision Reason */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5F6D61] mb-1">
                Decision Reason or Feedback for Merchant
              </label>
              <textarea
                rows={2}
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Enter approval comments, compliance notes, or specific instructions for resubmission..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-[#2E4D34] focus:outline-none bg-white"
              />
            </div>

            {/* Flagged Sections (For Resubmit) */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">
                If Requesting Resubmit, Flag:
              </span>
              {['store_details', 'pickup_address', 'kyc_documents', 'bank_details'].map((sec) => (
                <label key={sec} className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={flaggedSections.includes(sec)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFlaggedSections([...flaggedSections, sec]);
                      } else {
                        setFlaggedSections(flaggedSections.filter((s) => s !== sec));
                      }
                    }}
                    className="rounded border-[#D1DDD0] text-amber-600 focus:ring-amber-500"
                  />
                  <span className="capitalize">{sec.replace('_', ' ')}</span>
                </label>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                {seller.status !== 'under_review' && (
                  <button
                    type="button"
                    onClick={handlePickUpReview}
                    disabled={isMarkingUnderReview}
                    className="px-3.5 py-2 rounded-xl border border-[#D1DDD0] bg-white text-xs font-semibold text-[#223B28] hover:bg-[#FAF7F2]"
                  >
                    Mark Under Review
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleRequestResubmit}
                  disabled={isRequestingResubmit}
                  className="px-3.5 py-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold hover:bg-amber-200 disabled:opacity-50"
                >
                  Request Resubmit
                </button>

                <button
                  type="button"
                  onClick={() => setActionConfirm('reject')}
                  className="px-3.5 py-2 rounded-xl border border-red-200 text-red-700 bg-white text-xs font-semibold hover:bg-red-50"
                >
                  Reject Merchant
                </button>
              </div>

              <div className="flex items-center gap-2">
                {seller.status === 'approved' ? (
                  <button
                    type="button"
                    onClick={() => setActionConfirm('suspend')}
                    className="px-4 py-2 rounded-xl bg-red-100 text-red-800 border border-red-300 text-xs font-semibold hover:bg-red-200"
                  >
                    Suspend Merchant
                  </button>
                ) : seller.status === 'suspended' ? (
                  <button
                    type="button"
                    onClick={() => setActionConfirm('reactivate')}
                    className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-200"
                  >
                    Reactivate Merchant
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isApproving}
                    onClick={() => setActionConfirm('approve')}
                    className="px-6 py-2.5 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] disabled:opacity-50 shadow-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Merchant</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        {previewDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-700 overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[92vh]">
              <div className="p-4 border-b border-[#EAE5DB] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="font-bold text-sm text-[#223B28]">{previewDoc.title}</h3>
                  <p className="text-xs text-[#8E9B90]">{previewDoc.file_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#D1DDD0] text-xs font-semibold text-[#2E4D34] hover:bg-[#FAF7F2]"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(null)}
                    className="p-1.5 text-gray-500 hover:text-black rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-[#FAF7F2] flex items-center justify-center p-4 min-h-[400px]">
                {isPdfDoc(previewDoc) ? (
                  <iframe src={previewDoc.file_url} title={previewDoc.title} className="w-full h-[75vh] rounded-xl border border-[#D1DDD0] bg-white" />
                ) : (
                  <img src={previewDoc.file_url} alt={previewDoc.title} className="max-w-full max-h-[75vh] object-contain rounded-xl shadow" />
                )}
              </div>

              {isVerifierOrSuperAdmin && (
                <div className="p-3 border-t border-[#EAE5DB] flex items-center justify-end gap-2 shrink-0">
                  {previewDoc.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingDoc(previewDoc);
                        setDocRejectReason('');
                        setPreviewDoc(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold"
                    >
                      Reject Document
                    </button>
                  )}
                  {previewDoc.status !== 'verified' && (
                    <button
                      type="button"
                      disabled={isVerifyingDoc}
                      onClick={async () => {
                        await handleVerifyDoc(previewDoc);
                        setPreviewDoc(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#2E4D34] text-white hover:bg-[#233B28] text-xs font-semibold disabled:opacity-50"
                    >
                      Mark Verified
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REJECT DOC REASON DIALOG */}
        {rejectingDoc && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl p-6 animate-scaleUp">
              <h3 className="text-sm font-bold text-[#223B28] mb-2">
                Reject Document: {rejectingDoc.title}
              </h3>
              <p className="text-xs text-[#5F6D61] mb-4">
                Please specify why this document is unacceptable so the merchant can correct it.
              </p>

              <form onSubmit={handleRejectDocSubmit} className="space-y-4">
                <textarea
                  rows={3}
                  required
                  value={docRejectReason}
                  onChange={(e) => setDocRejectReason(e.target.value)}
                  placeholder="e.g. Scanned image is blurry, name does not match legal entity, or document has expired."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#D1DDD0] focus:ring-2 focus:ring-red-500 focus:outline-none"
                />

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setRejectingDoc(null)}
                    className="px-4 py-2 rounded-xl border border-[#D1DDD0] text-xs font-semibold text-[#5F6D61]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRejectingDoc}
                    className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-xs"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DECISION CONFIRM DIALOG */}
        {actionConfirm && (
          <ConfirmDialog
            isOpen={true}
            title={
              actionConfirm === 'approve'
                ? 'Approve Merchant Application'
                : actionConfirm === 'reject'
                ? 'Reject Merchant Application'
                : actionConfirm === 'suspend'
                ? 'Suspend Merchant Account'
                : 'Reactivate Merchant Account'
            }
            message={`Are you sure you want to ${actionConfirm} ${seller?.store_name}? This action will update their store status immediately and be recorded in the audit log.`}
            confirmText={actionConfirm.charAt(0).toUpperCase() + actionConfirm.slice(1)}
            isDanger={actionConfirm !== 'approve' && actionConfirm !== 'reactivate'}
            onConfirm={executeConfirmedAction}
            onClose={() => setActionConfirm(null)}
          />
        )}
      </div>
    </div>
  );
};
