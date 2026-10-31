import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  MessageSquare,
  Send,
  Loader2,
  User,
  Shield,
} from 'lucide-react';
import { PageHeader } from '../../../components/vendor/PageHeader';
import { StatusBadge } from '../../../components/vendor/StatusBadge';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { ErrorState } from '../../../components/vendor/ErrorState';
import { useToast } from '../../../components/vendor/Toast';
import { Button } from '../../../components/ui/Button';
import {
  getVendorSupportTickets,
  createVendorSupportTicket,
  getVendorSupportTicketDetail,
  replyVendorSupportTicket,
} from '../../../api/vendorPortalApi';

export const VendorSupportPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New ticket state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('orders');
  const [priority, setPriority] = useState('medium');
  const [message, setMessage] = useState('');

  // Reply message
  const [replyMessage, setReplyMessage] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vendor-support-tickets'],
    queryFn: getVendorSupportTickets,
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['vendor-support-ticket-detail', selectedTicketId],
    queryFn: () => (selectedTicketId ? getVendorSupportTicketDetail(selectedTicketId) : null),
    enabled: Boolean(selectedTicketId),
  });

  const createMutation = useMutation({
    mutationFn: createVendorSupportTicket,
    onSuccess: (res) => {
      toast.showToast(res.message || 'Support ticket submitted.', 'success');
      setIsCreateModalOpen(false);
      setSubject('');
      setMessage('');
      void queryClient.invalidateQueries({ queryKey: ['vendor-support-tickets'] });
      setSelectedTicketId(res.id);
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to submit support ticket.', 'error');
    },
  });

  const replyMutation = useMutation({
    mutationFn: (vars: { id: string; msg: string }) =>
      replyVendorSupportTicket(vars.id, vars.msg),
    onSuccess: () => {
      toast.showToast('Reply sent.', 'success');
      setReplyMessage('');
      void queryClient.invalidateQueries({ queryKey: ['vendor-support-ticket-detail', selectedTicketId] });
      void queryClient.invalidateQueries({ queryKey: ['vendor-support-tickets'] });
    },
    onError: (err: any) => {
      toast.showToast(err?.message || 'Failed to send reply.', 'error');
    },
  });

  const tickets = data?.results || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ subject, category, priority, message });
  };

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyMessage.trim()) return;
    replyMutation.mutate({ id: selectedTicketId, msg: replyMessage.trim() });
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Artisan Seller Support"
          description="Get direct assistance with order processing, payouts, catalog approvals, and compliance."
        />

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Support Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tickets List */}
        <div className="bg-white rounded-2xl border border-[#EAE5DB] p-4 shadow-xs space-y-3">
          <h3 className="font-serif text-sm font-bold text-[#223B28] px-1">
            My Support Conversations ({tickets.length})
          </h3>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#8E9B90]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#2E4D34]" />
              Loading tickets...
            </div>
          ) : isError ? (
            <ErrorState message="Failed to load support tickets." onRetry={refetch} />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="No open tickets"
              description="Have a question or need assistance? Open a new ticket anytime."
              action={{
                label: 'Contact Support',
                onClick: () => setIsCreateModalOpen(true),
              }}
            />
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selectedTicketId === t.id
                      ? 'border-[#2E4D34] bg-[#EAF1EA]/40 shadow-xs'
                      : 'border-[#FAF7F2] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[11px] font-bold text-[#2E4D34]">
                      #{t.ticket_number}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        t.status === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : t.status === 'resolved'
                          ? 'bg-[#EAF1EA] text-[#2E4D34]'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-[#223B28] line-clamp-1">{t.subject}</p>
                  <p className="text-[11px] text-[#637365] line-clamp-1 mt-0.5">{t.last_message}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Selected Ticket Detail & Chat */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE5DB] p-5 shadow-xs flex flex-col justify-between min-h-[500px]">
          {selectedTicketId && ticketDetail ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Ticket Header */}
              <div className="border-b border-[#FAF7F2] pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#2E4D34] bg-[#EAF1EA] px-2 py-0.5 rounded">
                      #{ticketDetail.ticket_number}
                    </span>
                    <h3 className="font-serif text-base font-bold text-[#223B28]">
                      {ticketDetail.subject}
                    </h3>
                  </div>
                  <p className="text-[11px] text-[#8E9B90] mt-1">
                    Category: <strong className="text-[#4F5E51] uppercase">{ticketDetail.category}</strong> • Priority: <strong className="text-[#4F5E51] uppercase">{ticketDetail.priority}</strong>
                  </p>
                </div>

                <StatusBadge
                  status={
                    ticketDetail.status === 'resolved'
                      ? 'success'
                      : ticketDetail.status === 'closed'
                      ? 'neutral'
                      : ticketDetail.status === 'in_progress' || ticketDetail.status === 'waiting_vendor'
                      ? 'warning'
                      : 'pending'
                  }
                  label={ticketDetail.status.replace('_', ' ')}
                />
              </div>

              {/* Message Thread */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] p-2">
                {ticketDetail.messages?.map((m) => {
                  const isStaff = m.sender_role === 'admin' || m.sender_role === 'staff';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-[#8E9B90]">
                        {isStaff ? (
                          <>
                            <Shield className="w-3 h-3 text-[#2E4D34]" />
                            <strong className="text-[#2E4D34]">{m.sender_name} (ChillyFlakes Support)</strong>
                          </>
                        ) : (
                          <>
                            <strong className="text-[#4F5E51]">{m.sender_name}</strong>
                            <User className="w-3 h-3 text-[#637365]" />
                          </>
                        )}
                        <span>
                          {new Date(m.created_at).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-lg text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-[#EAF1EA] text-[#1E3623] border border-[#D1DDD0] rounded-tl-xs'
                            : 'bg-[#FAF7F2] text-[#223B28] border border-[#EAE5DB] rounded-tr-xs'
                        }`}
                      >
                        {m.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleReplySubmit} className="pt-3 border-t border-[#FAF7F2] flex gap-2">
                <input
                  type="text"
                  placeholder="Type your response to support team..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  className="flex-1 text-xs p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={replyMutation.isPending || !replyMessage.trim()}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-10 h-10 text-[#D1DDD0] mb-3" />
              <h4 className="font-serif text-base font-bold text-[#223B28]">Select a conversation</h4>
              <p className="text-xs text-[#8E9B90] max-w-sm mt-1">
                Choose a ticket from the left panel to inspect message history or reply directly to our support desk.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-[#D1DDD0] shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="font-serif text-lg font-bold text-[#223B28]">
              Open New Support Ticket
            </h3>
            <p className="text-xs text-[#637365]">
              Our artisan operations team typically replies within 2-4 business hours.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Question regarding Order dispatch"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#4F5E51] block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                  >
                    <option value="orders">Orders & Fulfillment</option>
                    <option value="payouts">Payouts & Finance</option>
                    <option value="products">Catalog & Approvals</option>
                    <option value="account">Account & KYC</option>
                    <option value="technical">Portal Technical Help</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-[#4F5E51] block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#4F5E51] block mb-1">Message Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide context, order numbers, or specific details to help us assist you faster..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#D1DDD0] bg-[#FAF7F2] text-[#223B28] focus:ring-1 focus:ring-[#2E4D34]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#FAF7F2]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorSupportPage;
