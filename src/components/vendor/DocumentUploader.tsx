import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  FileText,
  Trash2,
  RefreshCw,
  Camera,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from './ConfirmDialog';
import { uploadOnboardingDocument, deleteOnboardingDocument, getDocumentPreviewLink } from '../../api/vendorOnboarding';
import type { DocumentType, DocumentUploadResponse, UploadedDocument } from '../../types/onboarding';

export interface DocumentUploaderProps {
  label: string;
  description?: string;
  documentType: DocumentType;
  value?: UploadedDocument | null;
  onChange: (doc: UploadedDocument | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  maxSizeMB?: number;
  allowedExtensions?: string[];
  helperNote?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  description,
  documentType,
  value,
  onChange,
  error: externalError,
  disabled = false,
  required = false,
  maxSizeMB = 5,
  allowedExtensions,
  helperNote,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Defaults based on document type
  const isImageOnly = documentType === 'store_logo' || documentType === 'store_banner';
  const effectiveMaxSizeMB =
    maxSizeMB ?? (documentType === 'store_logo' ? 2 : documentType === 'store_banner' ? 3 : 5);
  const effectiveExtensions =
    allowedExtensions ??
    (isImageOnly ? ['.jpg', '.jpeg', '.png', '.webp'] : ['.jpg', '.jpeg', '.png', '.pdf']);

  const acceptAttribute = isImageOnly
    ? 'image/jpeg,image/png,image/webp'
    : 'image/jpeg,image/png,image/webp,application/pdf';

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch short-lived preview link when document exists and is sensitive or an image
  useEffect(() => {
    let isMounted = true;
    if (value?.id) {
      getDocumentPreviewLink(value.id)
        .then((res) => {
          if (isMounted) setPreviewUrl(res.url);
        })
        .catch(() => {
          // Preview link failure should not break the form
        });
    } else {
      setPreviewUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [value?.id]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!effectiveExtensions.includes(ext)) {
        return t('onboarding.uploader.invalidType', {
          extensions: effectiveExtensions.join(', '),
          defaultValue: `Only ${effectiveExtensions.join(', ')} files are supported.`,
        });
      }

      const maxBytes = effectiveMaxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return t('onboarding.uploader.fileTooLarge', {
          maxSize: effectiveMaxSizeMB,
          defaultValue: `File size exceeds the maximum limit of ${effectiveMaxSizeMB} MB.`,
        });
      }

      return null;
    },
    [effectiveExtensions, effectiveMaxSizeMB, t]
  );

  const processUpload = async (file: File) => {
    setInternalError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setInternalError(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    // Simulated progress tick for rich UX
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return prev;
        }
        return prev + 15;
      });
    }, 120);

    try {
      const res = await uploadOnboardingDocument(file, documentType);
      const raw = res as DocumentUploadResponse & { document_id?: string; file_name?: string };
      const docId = raw.id || raw.document_id;
      if (!docId) {
        throw new Error(
          t('onboarding.uploader.uploadFailed', {
            defaultValue: 'Upload failed. Please check your connection and retry.',
          })
        );
      }

      const newDoc: UploadedDocument = {
        id: docId,
        document_type: documentType,
        filename: raw.filename || file.name,
        size: raw.size || file.size,
        type: raw.type || file.type,
        status: raw.status || 'uploaded',
        created_at: new Date().toISOString(),
      };

      clearInterval(interval);
      setUploadProgress(100);
      onChange(newDoc);
    } catch (err: unknown) {
      clearInterval(interval);
      const apiErr = err as { message?: string };
      setInternalError(
        apiErr.message ||
          t('onboarding.uploader.uploadFailed', {
            defaultValue: 'Upload failed. Please check your connection and retry.',
          })
      );
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 400);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processUpload(file);
    }
  };

  const handleConfirmRemove = async () => {
    if (!value?.id) {
      onChange(null);
      setShowRemoveConfirm(false);
      return;
    }

    setIsDeleting(true);
    try {
      await deleteOnboardingDocument(value.id);
      onChange(null);
      setPreviewUrl(null);
    } catch {
      // Clear client state even if backend network call encounters temporary failure
      onChange(null);
      setPreviewUrl(null);
    } finally {
      setIsDeleting(false);
      setShowRemoveConfirm(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const activeError = externalError || internalError;
  const isPdf = value?.filename.toLowerCase().endsWith('.pdf') || value?.type.includes('pdf');

  return (
    <div className="w-full space-y-2">
      {/* Header and Label */}
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs sm:text-sm font-semibold text-[#223B28] flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-[#C53030] font-bold">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2E4D34] bg-[#EAF1EA] px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3 text-[#2E4D34]" />
            <span>{t('onboarding.uploader.uploadedBadge', { defaultValue: 'Uploaded' })}</span>
          </span>
        )}
      </div>

      {description && <p className="text-xs text-[#637365] leading-relaxed">{description}</p>}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptAttribute}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        aria-hidden="true"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        aria-hidden="true"
      />

      {/* Active Uploaded State */}
      {value ? (
        <div className="w-full p-4 rounded-2xl bg-white border border-[#D1DDD0] shadow-2xs hover:border-[#2E4D34] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Thumbnail or PDF icon */}
            <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#EAE5DB] flex-shrink-0 flex items-center justify-center overflow-hidden">
              {previewUrl && !isPdf ? (
                <img src={previewUrl} alt={value.filename} className="w-full h-full object-cover" />
              ) : (
                <FileText className="w-6 h-6 text-[#2E4D34]" />
              )}
            </div>

            {/* File info */}
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-[#223B28] truncate max-w-[200px] sm:max-w-xs">
                {value.filename}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#7A8A7C]">
                <span>{formatFileSize(value.size)}</span>
                {previewUrl && (
                  <>
                    <span>•</span>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#2E4D34] hover:underline font-medium"
                    >
                      <span>{t('onboarding.uploader.viewPreview', { defaultValue: 'Preview' })}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              {t('common.replace', { defaultValue: 'Replace' })}
            </Button>

            <button
              type="button"
              onClick={() => setShowRemoveConfirm(true)}
              disabled={disabled || isUploading}
              className="p-2 text-[#8E9B90] hover:text-[#C53030] hover:bg-[#FFF0F0] rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#C53030]"
              aria-label={t('common.remove', { defaultValue: 'Remove document' })}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Dropzone State */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full rounded-2xl border-2 border-dashed p-6 sm:p-7 text-center transition-all ${
            isDragging
              ? 'border-[#2E4D34] bg-[#EAF1EA]/50 scale-[1.01]'
              : activeError
              ? 'border-[#DC2626] bg-[#FFF8F7]'
              : 'border-[#D1DDD0] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] hover:border-[#2E4D34]/50'
          }`}
        >
          {isUploading ? (
            /* Upload Progress State */
            <div className="py-4 space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF1EA] text-[#2E4D34] mx-auto flex items-center justify-center animate-spin">
                <RefreshCw className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[#223B28]">
                {t('onboarding.uploader.uploading', { defaultValue: 'Uploading document...' })}
              </p>
              <div className="w-48 max-w-full mx-auto bg-[#EAE5DB] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#2E4D34] h-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* Interactive Picker */
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-2xs border border-[#EAE5DB] text-[#2E4D34] mx-auto flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-[#223B28]">
                  <span>{t('onboarding.uploader.dragPrompt', { defaultValue: 'Drag and drop your file here, or' })} </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="text-[#2E4D34] underline hover:text-[#1D3222] font-bold focus:outline-none focus:ring-1 focus:ring-[#2E4D34] rounded"
                  >
                    {t('onboarding.uploader.browse', { defaultValue: 'browse files' })}
                  </button>
                </p>
                <p className="text-[11px] text-[#7A8A7C]">
                  {effectiveExtensions.map((e) => e.replace('.', '').toUpperCase()).join(', ')} • Max {effectiveMaxSizeMB} MB
                </p>
              </div>

              {/* Mobile Camera Fast-Action */}
              <div className="pt-1 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                >
                  {t('onboarding.uploader.chooseFile', { defaultValue: 'Choose File' })}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={disabled}
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                  className="sm:hidden text-xs text-[#5F6D61]"
                >
                  {t('onboarding.uploader.takePhoto', { defaultValue: 'Camera' })}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Announcement */}
      {activeError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-xs text-[#B91C1C]"
        >
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{activeError}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs font-bold underline hover:text-[#991B1B] transition-colors"
          >
            {t('common.retry', { defaultValue: 'Retry' })}
          </button>
        </div>
      )}

      {/* Helper Note & Security Assurance Footnote */}
      <div className="flex items-center gap-1.5 text-[11px] text-[#7A8A7C]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#2E4D34] flex-shrink-0" />
        <span>
          {helperNote ||
            t('onboarding.uploader.securityAssurance', {
              defaultValue: 'Your documents are stored securely and seen only by ChillyFlakes verification staff.',
            })}
        </span>
      </div>

      {/* Confirmation Dialog on Remove */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleConfirmRemove}
        title={t('onboarding.uploader.removeTitle', { defaultValue: 'Remove Document?' })}
        message={t('onboarding.uploader.removeMessage', {
          defaultValue: 'Are you sure you want to remove this document? You will need to re-upload it before submitting.',
        })}
        confirmText={t('common.remove', { defaultValue: 'Remove' })}
        cancelText={t('common.cancel', { defaultValue: 'Cancel' })}
        isDanger={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
export default DocumentUploader;
