import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LifeBuoy,
  Search,
  RefreshCw,
  Send,
  User,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Store,
} from 'lucide-react';
import { axiosClient } from '../../../api/client';
import { useToast } from '../../../components/vendor/Toast';
import { EmptyState } from '../../../components/vendor/EmptyState';
import { Skeleton } from '../../../components/vendor/Skeleton';

interface SupportMessage {
  id: string;
  senderRole: 'VENDOR' | 'SUPER_ADMIN' | 'STAFF';
  message: string;
  attachments?: string[];
  createdAt: string;
  sender?: {
    name?: string;
    email: string;
    role: string;
  };
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  user?: {
    name?: string;
    email: string;
  };
  vendor?: {
    id: string;
    storeName?: string;
  };
  messages?: SupportMessage[];
}

export const AdminSupportPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch Tickets List
  const { data, isLoading, isFetching, refetch } = useQuery<{
    success: boolean;
    tickets: SupportTicket[];
    pagination?: { total: number };
  }>({
    queryKey: ['admin-support-tickets', statusFilter, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await axiosClient.get('/api/v1/admin/support/tickets/', { params });
      return res.data;
    },
  });

  const tickets = data?.tickets || [];

  // Fetch active ticket detail if selected
  const { data: ticketDetailData, isLoading: isTicketLoading } = useQuery<{
    success: boolean;
    ticket: SupportTicket;
  }>({
    queryKey: ['admin-support-ticket-detail', selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) throw new Error('No ticket selected');
      const res = await axiosClient.get(`/api/v1/admin/support/tickets/${selectedTicketId}/`);
      return res.data;
    },
    enabled: !!selectedTicketId,
  });

  const activeTicket = ticketDetailData?.ticket || tickets.find((t) => t.id === selectedTicketId);

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const res = await axiosClient.patch(`/api/v1/admin/support/tickets/${ticketId}/status/`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success(`Ticket marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-detail', vars.ticketId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ ticketId, message }: { ticketId: string; message: string }) => {
      const res = await axiosClient.post(`/api/v1/admin/support/tickets/${ticketId}/messages/`, { message });
      return res.data;
    },
    onSuccess: (_, vars) => {
      toast.success('Reply sent to vendor');
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['admin-support-ticket-detail', vars.ticketId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicketId) return;
    replyMutation.mutate({ ticketId: selectedTicketId, message: replyText.trim() });
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3 h-3" /> Open
          </span>
        );
      case 'IN_PROGRESS':
      case 'WAITING_VENDOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-600 border border-stone-200">
            <XCircle className="w-3 h-3" /> Closed
          </span>
        );
      default:
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-100 text-stone-700">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toUpperCase();
    switch (p) {
      case 'URGENT':
        return <span className="text-xs px-2 py-0.5 font-bold rounded bg-rose-100 text-rose-800">URGENT</span>;
      case 'HIGH':
        return <span className="text-xs px-2 py-0.5 font-semibold rounded bg-amber-100 text-amber-800">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-100 text-stone-700">MEDIUM</span>;
      case 'LOW':
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-100 text-stone-500">LOW</span>;
      default:
        return <span className="text-xs px-2 py-0.5 font-medium rounded bg-stone-100 text-stone-500">{p || 'LOW'}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-[#1B4D3E]" />
            Vendor Support Desk
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Review, triage, and respond to artisan and merchant inquiries and service tickets.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-300 rounded-lg text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Panel: Ticket List */}
        <div className="lg:col-span-5 bg-white border border-stone-200 rounded-xl flex flex-col shadow-sm">
          {/* Filters & Search */}
          <div className="p-4 border-b border-stone-100 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ticket #, subject, store..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
              {['all', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-md font-medium capitalize whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-[#1B4D3E] text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {st.toLowerCase().replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<LifeBuoy className="w-8 h-8 text-stone-400" />}
                  title="No tickets found"
                  description="No vendor inquiries match your selected filters."
                />
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`w-full text-left p-4 transition-colors hover:bg-stone-50 flex flex-col gap-2 ${
                      isSelected ? 'bg-amber-50/40 border-l-4 border-l-[#1B4D3E]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-semibold text-stone-500">
                        {t.ticketNumber}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>
                    <h3 className="text-sm font-semibold text-stone-900 line-clamp-1">
                      {t.subject}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
                      <span className="flex items-center gap-1 text-stone-700 font-medium">
                        <Store className="w-3.5 h-3.5 text-stone-400" />
                        {t.vendor?.storeName || t.user?.name || t.user?.email || 'Artisan'}
                      </span>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(t.priority)}
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Ticket Thread & Reply */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-xl flex flex-col shadow-sm overflow-hidden">
          {selectedTicketId && activeTicket ? (
            <>
              {/* Header Info */}
              <div className="p-5 border-b border-stone-100 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 border border-stone-200 rounded text-stone-600">
                      {activeTicket.ticketNumber}
                    </span>
                    {getPriorityBadge(activeTicket.priority)}
                    {getStatusBadge(activeTicket.status)}
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 font-serif">
                    {activeTicket.subject}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 mt-1">
                    <span>
                      Vendor: <strong>{activeTicket.vendor?.storeName || 'Artisan'}</strong>
                    </span>
                    <span>•</span>
                    <span>Category: {activeTicket.category}</span>
                    <span>•</span>
                    <span>Created: {new Date(activeTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Status Switcher Action */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-stone-500">Status:</label>
                  <select
                    value={activeTicket.status}
                    onChange={(e) =>
                      statusMutation.mutate({
                        ticketId: activeTicket.id,
                        status: e.target.value,
                      })
                    }
                    disabled={statusMutation.isPending}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#1B4D3E]"
                  >
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[480px]">
                {isTicketLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4 rounded-xl" />
                    <Skeleton className="h-16 w-3/4 ml-auto rounded-xl" />
                  </div>
                ) : (
                  (activeTicket.messages || []).map((msg) => {
                    const isStaff = msg.senderRole === 'SUPER_ADMIN' || msg.senderRole === 'STAFF';
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 max-w-[85%] ${isStaff ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            isStaff ? 'bg-[#1B4D3E] text-white' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isStaff ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div
                            className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                              isStaff
                                ? 'bg-[#1B4D3E] text-white rounded-tr-none'
                                : 'bg-stone-100 text-stone-800 rounded-tl-none'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 text-[11px] text-stone-400 mt-1 px-1 ${
                              isStaff ? 'justify-end' : ''
                            }`}
                          >
                            <span>
                              {isStaff
                                ? `Staff (${msg.sender?.name || 'Administrator'})`
                                : activeTicket.vendor?.storeName || 'Vendor'}
                            </span>
                            <span>•</span>
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Staff Reply Form */}
              <div className="p-4 border-t border-stone-200 bg-stone-50/50">
                <form onSubmit={handleSendReply} className="space-y-2">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type official reply or resolution for the merchant..."
                    className="w-full text-sm p-3 border border-stone-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1B4D3E] bg-white resize-none"
                    disabled={replyMutation.isPending || activeTicket.status === 'CLOSED'}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-stone-500">
                      {activeTicket.status === 'CLOSED'
                        ? 'This ticket is closed. Change status to reply.'
                        : 'Reply will be immediately visible on vendor portal.'}
                    </p>
                    <button
                      type="submit"
                      disabled={replyMutation.isPending || !replyText.trim() || activeTicket.status === 'CLOSED'}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4D3E] text-white text-xs font-semibold rounded-lg hover:bg-[#153e32] disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {replyMutation.isPending ? 'Sending...' : 'Send Staff Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <EmptyState
                icon={<LifeBuoy className="w-12 h-12 text-stone-300" />}
                title="Select a ticket to review"
                description="Choose an artisan ticket from the left panel to inspect the inquiry history and dispatch official staff replies."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
