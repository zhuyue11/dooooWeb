import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { createGroupInvitation } from '@/lib/api';
import type { GroupMember } from '@/types/api';

interface InviteMemberModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  members: GroupMember[];
  onSuccess: () => void;
}

type DeliveryMethod = 'LINK' | 'EMAIL' | 'BOTH';
type InviteRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

const DELIVERY_OPTIONS: { value: DeliveryMethod; icon: string; labelKey: string; descKey: string }[] = [
  { value: 'LINK', icon: 'link', labelKey: 'groups.inviteModalDeliveryLink', descKey: 'groups.inviteModalDeliveryLinkDesc' },
  { value: 'EMAIL', icon: 'email', labelKey: 'groups.inviteModalDeliveryEmail', descKey: 'groups.inviteModalDeliveryEmailDesc' },
  { value: 'BOTH', icon: 'share', labelKey: 'groups.inviteModalDeliveryBoth', descKey: 'groups.inviteModalDeliveryBothDesc' },
];

const ROLE_OPTIONS: { value: InviteRole; icon: string; labelKey: string; descKey: string }[] = [
  { value: 'MEMBER', icon: 'person', labelKey: 'groups.inviteModalRoleMember', descKey: 'groups.inviteModalRoleMemberDesc' },
  { value: 'ADMIN', icon: 'admin_panel_settings', labelKey: 'groups.inviteModalRoleAdmin', descKey: 'groups.inviteModalRoleAdminDesc' },
  { value: 'VIEWER', icon: 'visibility', labelKey: 'groups.inviteModalRoleViewer', descKey: 'groups.inviteModalRoleViewerDesc' },
];

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function InviteMemberModal({
  open,
  onClose,
  groupId,
  groupName,
  members,
  onSuccess,
}: InviteMemberModalProps) {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InviteRole>('MEMBER');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('LINK');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('MEMBER');
      setDeliveryMethod('LINK');
      setError('');
      setCopiedCode('');
    }
  }, [open]);

  if (!open) return null;

  const trimmedEmail = email.trim().toLowerCase();
  const emailRequired = deliveryMethod === 'EMAIL' || deliveryMethod === 'BOTH';

  async function handleSubmit() {
    setError('');

    // Validation (matching dooooApp InviteMemberModal:64-92)
    if (emailRequired && !trimmedEmail) {
      setError(t('groups.inviteModalEmailRequired'));
      return;
    }
    if (trimmedEmail && !validateEmail(trimmedEmail)) {
      setError(t('groups.inviteModalEmailInvalid'));
      return;
    }
    if (trimmedEmail) {
      const isAlreadyMember = members.some(
        (m) => m.user?.email?.toLowerCase() === trimmedEmail,
      );
      if (isAlreadyMember) {
        setError(t('groups.inviteModalAlreadyMember'));
        return;
      }
    }

    setSubmitting(true);
    try {
      const response = await createGroupInvitation(groupId, {
        email: trimmedEmail || undefined,
        role,
        deliveryMethod,
      });

      // For LINK/BOTH: copy short code to clipboard
      if (
        (deliveryMethod === 'LINK' || deliveryMethod === 'BOTH') &&
        response?.invitation?.shortCode
      ) {
        const codeText = t('groups.inviteModalCodeMessage', {
          shortCode: response.invitation.shortCode,
        });
        try {
          await navigator.clipboard.writeText(codeText);
          setCopiedCode(response.invitation.shortCode);
        } catch {
          // Clipboard failed — show code inline instead
          setCopiedCode(response.invitation.shortCode);
        }
      }

      onSuccess();

      // For EMAIL-only, close immediately
      if (deliveryMethod === 'EMAIL') {
        onClose();
      }
      // For LINK/BOTH, keep modal open briefly to show copied feedback
      // then close after a short delay
      if (deliveryMethod === 'LINK' || deliveryMethod === 'BOTH') {
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr?.response?.status === 409) {
        setError(t('groups.inviteModalAlreadyMember'));
      } else {
        setError(t('groups.inviteModalError'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const submitDisabled = submitting || (emailRequired && !email.trim());
  const submitLabel =
    deliveryMethod === 'LINK'
      ? t('groups.inviteModalShare')
      : t('groups.inviteModalSend');

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-(--el-modal-overlay)"
      onClick={onClose}
    >
      <div
        className="mx-4 flex w-full max-w-lg flex-col rounded-(--radius-modal) bg-(--el-modal-bg) shadow-(--shadow-modal)"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--el-card-border) px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) hover:bg-(--el-popover-item-hover) disabled:opacity-50"
            >
              <Icon name="close" size={20} color="var(--el-modal-title-text)" />
            </button>
            <h2 className="text-base font-semibold text-(--el-modal-title-text)">
              {t('groups.inviteModalTitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              submitLabel
            )}
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {/* Copied code success message */}
          {copiedCode && (
            <div className="mb-4 flex items-center gap-2 rounded-(--radius-card) bg-(--el-group-success-bg) px-3 py-2.5">
              <Icon name="check_circle" size={18} color="var(--el-group-success-icon)" />
              <span className="text-sm text-(--el-group-title)">
                {t('groups.inviteModalCopiedMessage')} — <span className="font-mono font-semibold">{copiedCode}</span>
              </span>
            </div>
          )}

          {/* Info box */}
          {!copiedCode && (
            <div className="mb-4 flex items-start gap-2 rounded-(--radius-card) bg-(--el-group-info-bg) px-3 py-2.5">
              <Icon name="info" size={18} color="var(--el-group-info-icon)" className="mt-0.5 shrink-0" />
              <span className="text-sm text-(--el-group-description)">
                {t('groups.inviteModalInfoText')}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-(--radius-card) bg-(--el-editor-error)/10 px-3 py-2">
              <Icon name="error" size={16} color="var(--el-editor-error)" />
              <span className="text-sm text-(--el-editor-error)">{error}</span>
            </div>
          )}

          {/* Delivery method */}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-(--el-input-label)">
              {t('groups.inviteModalDeliveryEmail').replace(/^.*$/, '')}
            </label>
            <div className="flex flex-col gap-2">
              {DELIVERY_OPTIONS.map((opt) => {
                const selected = deliveryMethod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDeliveryMethod(opt.value);
                      setError('');
                    }}
                    className={`flex items-center gap-3 rounded-(--radius-card) border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-(--el-group-option-active-border) bg-(--el-group-option-active-bg)'
                        : 'border-(--el-group-option-inactive-border) hover:bg-(--el-popover-item-hover)'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        selected ? 'bg-(--el-group-option-icon-active-bg)' : 'bg-(--el-group-option-icon-inactive-bg)'
                      }`}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={selected ? 'var(--el-group-option-icon-active)' : 'var(--el-group-option-icon-inactive)'}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-(--el-group-title)">{t(opt.labelKey)}</div>
                      <div className="text-xs text-(--el-group-description)">{t(opt.descKey)}</div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        selected
                          ? 'border-(--el-group-radio-active-border) bg-(--el-group-radio-active-bg)'
                          : 'border-(--el-group-radio-inactive-border)'
                      }`}
                    >
                      {selected && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email input (conditional) */}
          {deliveryMethod !== 'LINK' && (
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-(--el-input-label)">
                {t('groups.inviteModalEmailLabel')}
                {emailRequired && <span className="ml-0.5 text-(--el-editor-error)">*</span>}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder={t('groups.inviteModalEmailPlaceholder')}
                autoFocus
                className="w-full rounded-(--radius-input) border border-(--el-input-border) bg-transparent px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus) focus:outline-none"
              />
            </div>
          )}

          {/* Role selection */}
          <div>
            <label className="mb-2 block text-sm font-medium text-(--el-input-label)">
              {t('groups.inviteModalInviteAs')}
            </label>
            <div className="flex flex-col gap-2">
              {ROLE_OPTIONS.map((opt) => {
                const selected = role === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`flex items-center gap-3 rounded-(--radius-card) border px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? 'border-(--el-group-option-active-border) bg-(--el-group-option-active-bg)'
                        : 'border-(--el-group-option-inactive-border) hover:bg-(--el-popover-item-hover)'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        selected ? 'bg-(--el-group-option-icon-active-bg)' : 'bg-(--el-group-option-icon-inactive-bg)'
                      }`}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={selected ? 'var(--el-group-option-icon-active)' : 'var(--el-group-option-icon-inactive)'}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-(--el-group-title)">{t(opt.labelKey)}</div>
                      <div className="text-xs text-(--el-group-description)">{t(opt.descKey)}</div>
                    </div>
                    <div
                      className={`h-4 w-4 rounded-full border-2 ${
                        selected
                          ? 'border-(--el-group-radio-active-border) bg-(--el-group-radio-active-bg)'
                          : 'border-(--el-group-radio-inactive-border)'
                      }`}
                    >
                      {selected && (
                        <div className="flex h-full items-center justify-center">
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
