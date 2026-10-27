import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Calendar, 
  Heart, 
  User, 
  LogOut, 
  Plus, 
  Trash2, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupees } from '../utils/currency';
import { INDIAN_STATES } from '../data/indianStates';

export const BuyerAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'orders';

  const { 
    user, 
    logoutUser, 
    orders, 
    cancelOrder, 
    bookings, 
    cancelBooking, 
    addresses, 
    addAddress, 
    removeAddress, 
    setDefaultAddress,
    wishlist,
    products,
    showToast 
  } = useStore();

  const [isAddingAddress, setIsAddingAddress] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>(user?.name || '');
  const [newPhone, setNewPhone] = useState<string>(user?.phone || '9876543210');
  const [newStreet, setNewStreet] = useState<string>('');
  const [newLandmark, setNewLandmark] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('Bengaluru');
  const [newState, setNewState] = useState<string>('Karnataka');
  const [newPostalCode, setNewPostalCode] = useState<string>('560103');
  const [newType, setNewType] = useState<'Home' | 'Work' | 'Other'>('Home');

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone || !newStreet || !newCity || !newPostalCode) {
      showToast('Please fill in all address fields.', 'warning');
      return;
    }
    addAddress({
      fullName: newFullName,
      phone: newPhone,
      street: newStreet,
      landmark: newLandmark,
      city: newCity,
      state: newState,
      postalCode: newPostalCode,
      type: newType,
      isDefault: addresses.length === 0,
    });
    setIsAddingAddress(false);
    setNewStreet('');
    setNewLandmark('');
  };

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="bg-[#FAF7F2] min-h-screen py-8 sm:py-12 border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D] mb-6">
          <Link to="/" className="hover:text-[#2E4D34]">Home</Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">Buyer Account & Orders</span>
        </div>

        {/* User Welcome Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2E4D34] text-white flex items-center justify-center font-serif text-2xl font-bold">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-[#223B28]">
                  Hello, {user?.name || 'Valued Customer'}
                </h1>
                <span className="bg-[#EAF1EA] text-[#2E4D34] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#D5E5D3]">
                  VERIFIED BUYER
                </span>
              </div>
              <p className="text-xs text-[#6C7B6D] mt-0.5">
                {user?.email || 'buyer@example.com'} • +91 {user?.phone || '9876543210'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/shop"
              className="px-5 py-2.5 bg-[#FAF7F2] hover:bg-[#EAF1EA] text-[#2E4D34] font-semibold text-xs rounded-full border border-[#D5C9B3] transition-colors"
            >
              Browse Catalog
            </Link>
            <button
              onClick={() => {
                logoutUser();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#D82C20] hover:bg-[#FAF0ED] rounded-full transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Dashboard Grid: Left Tabs + Right Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* ==================================================== */}
          {/* LEFT: Navigation Tabs                                */}
          {/* ==================================================== */}
          <div className="lg:col-span-3 bg-white rounded-3xl p-3 border border-[#ECE7DD] shadow-xs space-y-1">
            {[
              { id: 'orders', label: 'My Orders', icon: Package, badge: orders.length },
              { id: 'bookings', label: 'Service Bookings', icon: Calendar, badge: bookings.length },
              { id: 'addresses', label: 'Delivery Addresses', icon: MapPin, badge: addresses.length },
              { id: 'wishlist', label: 'My Wishlist', icon: Heart, badge: wishlist.length },
              { id: 'profile', label: 'Profile Details', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#2E4D34] text-white shadow-xs'
                      : 'text-[#4F5E51] hover:bg-[#FAF7F2] hover:text-[#223B28]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#FAF7F2] text-[#6C7B6D]'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ==================================================== */}
          {/* RIGHT: Active Tab Content Area                       */}
          {/* ==================================================== */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* 1. MY ORDERS TAB */}
            {currentTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    Order History ({orders.length})
                  </h2>
                  <span className="text-xs text-[#6C7B6D]">
                    Real-time status of your handcrafted orders
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#ECE7DD] space-y-4">
                    <Package className="w-12 h-12 text-[#7E8F80] mx-auto" />
                    <h3 className="font-serif font-bold text-lg text-[#223B28]">No orders placed yet</h3>
                    <p className="text-xs text-[#6C7B6D] max-w-sm mx-auto">
                      Discover authentic cold-pressed botanicals, Kerala spices, and Indian artisanal finds.
                    </p>
                    <Link
                      to="/shop"
                      className="inline-block px-6 py-2.5 bg-[#2E4D34] text-white text-xs font-semibold rounded-full shadow-xs"
                    >
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-4"
                    >
                      {/* Order top bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#ECE7DD]">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-sm text-[#223B28]">{ord.id}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            ord.status === 'Delivered'
                              ? 'bg-[#EAF1EA] text-[#2E4D34]'
                              : ord.status === 'Cancelled'
                              ? 'bg-[#FAF0ED] text-[#D82C20]'
                              : 'bg-[#FFF8E6] text-[#B7791F]'
                          }`}>
                            {ord.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-[#6C7B6D]">
                          Placed on: {new Date(ord.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Items row */}
                      <div className="space-y-3">
                        {ord.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-[#FAF7F2] p-1 border border-[#ECE7DD] flex-shrink-0">
                              <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover rounded-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-semibold text-[#223B28] truncate">{item.product.name}</h4>
                              <p className="text-[11px] text-[#6C7B6D]">{item.product.category} • Qty: {item.quantity}</p>
                            </div>
                            <span className="text-xs font-bold text-[#223B28]">
                              {formatRupees(item.product.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom row actions */}
                      <div className="pt-4 border-t border-[#ECE7DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-[#6C7B6D]">Total Paid: </span>
                          <strong className="text-sm font-serif text-[#2E4D34]">{formatRupees(ord.totalAmount)}</strong>
                          <span className="text-[11px] text-[#7E8F80] ml-2">({ord.paymentMethod.toUpperCase()})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {ord.status !== 'Cancelled' && ord.status !== 'Delivered' && (
                            <button
                              onClick={() => cancelOrder(ord.id)}
                              className="px-3.5 py-1.5 text-xs text-[#D82C20] hover:bg-[#FAF0ED] rounded-xl font-medium transition-colors"
                            >
                              Cancel Order
                            </button>
                          )}
                          <Link
                            to={`/order-success/${ord.id}`}
                            className="px-4 py-1.5 bg-[#FAF7F2] hover:bg-[#2E4D34] text-[#2E4D34] hover:text-white rounded-xl border border-[#2E4D34] font-semibold transition-colors flex items-center gap-1"
                          >
                            <span>Track & Receipt</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. SERVICE BOOKINGS TAB */}
            {currentTab === 'bookings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    My Service Appointments ({bookings.length})
                  </h2>
                  <Link to="/services" className="text-xs text-[#2E4D34] font-semibold hover:underline">
                    Browse All Services
                  </Link>
                </div>

                {bookings.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-[#ECE7DD] space-y-4">
                    <Calendar className="w-12 h-12 text-[#7E8F80] mx-auto" />
                    <h3 className="font-serif font-bold text-lg text-[#223B28]">No appointments booked</h3>
                    <p className="text-xs text-[#6C7B6D] max-w-sm mx-auto">
                      Explore professional massage therapy, botanical skincare, organic tutoring, and home cleaning.
                    </p>
                    <Link
                      to="/services"
                      className="inline-block px-6 py-2.5 bg-[#2E4D34] text-white text-xs font-semibold rounded-full shadow-xs"
                    >
                      Book a Service
                    </Link>
                  </div>
                ) : (
                  bookings.map((bk) => (
                    <div key={bk.id} className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#ECE7DD] gap-2">
                        <div>
                          <span className="font-mono text-xs text-[#7E8F80]">{bk.id}</span>
                          <h3 className="font-serif text-lg font-bold text-[#223B28]">{bk.serviceTitle}</h3>
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                          bk.status === 'Confirmed' ? 'bg-[#EAF1EA] text-[#2E4D34]' : bk.status === 'Cancelled' ? 'bg-[#FAF0ED] text-[#D82C20]' : 'bg-[#FFF8E6] text-[#B7791F]'
                        }`}>
                          {bk.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#ECE7DD]">
                          <span className="text-[#6C7B6D] block text-[10px]">Preferred Date</span>
                          <span className="font-semibold text-[#223B28]">{bk.preferredDate}</span>
                        </div>
                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#ECE7DD]">
                          <span className="text-[#6C7B6D] block text-[10px]">Time Slot</span>
                          <span className="font-semibold text-[#223B28]">{bk.preferredTime}</span>
                        </div>
                        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#ECE7DD]">
                          <span className="text-[#6C7B6D] block text-[10px]">Estimated Price</span>
                          <span className="font-semibold text-[#2E4D34]">{bk.price}</span>
                        </div>
                      </div>

                      {bk.status !== 'Cancelled' && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => cancelBooking(bk.id)}
                            className="text-xs text-[#D82C20] hover:underline font-medium"
                          >
                            Cancel Appointment
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. SAVED ADDRESSES TAB */}
            {currentTab === 'addresses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    Saved Delivery Addresses ({addresses.length})
                  </h2>
                  <button
                    onClick={() => setIsAddingAddress(!isAddingAddress)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2E4D34] text-white text-xs font-semibold rounded-full shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{isAddingAddress ? 'Close Form' : 'Add New Address'}</span>
                  </button>
                </div>

                {isAddingAddress && (
                  <form onSubmit={handleSaveAddress} className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-sm space-y-4">
                    <h3 className="font-serif font-bold text-base text-[#223B28]">New Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        required
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Full Name"
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="10-Digit Mobile"
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      />
                    </div>
                    <input
                      type="text"
                      required
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      placeholder="Street / Flat / House No."
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={newLandmark}
                        onChange={(e) => setNewLandmark(e.target.value)}
                        placeholder="Landmark (Optional)"
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      />
                      <input
                        type="text"
                        required
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        placeholder="City"
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      />
                      <select
                        value={newState}
                        onChange={(e) => setNewState(e.target.value)}
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      >
                        {INDIAN_STATES.map((st) => (
                          <option key={st.code} value={st.name}>{st.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={newPostalCode}
                        onChange={(e) => setNewPostalCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-Digit PIN Code"
                        className="px-3.5 py-2 text-xs rounded-xl bg-[#FAF7F2] border border-[#D5C9B3]"
                      />
                      <div className="flex gap-2">
                        {(['Home', 'Work', 'Other'] as const).map((t) => (
                          <button
                            type="button"
                            key={t}
                            onClick={() => setNewType(t)}
                            className={`flex-1 py-2 text-xs font-semibold rounded-xl border ${
                              newType === t ? 'bg-[#2E4D34] text-white border-[#2E4D34]' : 'bg-[#FAF7F2]'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#2E4D34] text-white text-xs font-semibold rounded-xl"
                    >
                      Save Address
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="bg-white rounded-3xl p-5 border border-[#ECE7DD] shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#223B28]">{addr.fullName}</span>
                          <span className="text-[10px] font-semibold bg-[#FAF7F2] px-2 py-0.5 rounded-full border border-[#D5C9B3]">
                            {addr.type}
                          </span>
                        </div>
                        <p className="text-xs text-[#506052] mt-2 leading-relaxed">
                          {addr.street}, {addr.landmark && `${addr.landmark}, `}{addr.city}, {addr.state} — {addr.postalCode}
                        </p>
                        <p className="text-[11px] text-[#6C7B6D] mt-2">
                          Phone: +91 {addr.phone}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#ECE7DD] flex items-center justify-between text-xs">
                        {addr.isDefault ? (
                          <span className="text-[#2E4D34] font-bold">Default Delivery Address</span>
                        ) : (
                          <button
                            onClick={() => setDefaultAddress(addr.id)}
                            className="text-[#2E4D34] hover:underline font-semibold"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => removeAddress(addr.id)}
                          className="text-[#D82C20] hover:text-[#93180F] p-1"
                          title="Remove address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. MY WISHLIST TAB */}
            {currentTab === 'wishlist' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#ECE7DD]">
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    Saved Favorites ({wishlistedProducts.length})
                  </h2>
                  <Link to="/wishlist" className="text-xs text-[#2E4D34] font-semibold hover:underline">
                    Open Full Wishlist View
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {wishlistedProducts.map((p) => (
                    <div key={p.id} onClick={() => navigate(`/products/${p.id}`)} className="bg-white rounded-2xl p-3 border border-[#ECE7DD] shadow-xs cursor-pointer hover:shadow-md transition-all">
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#FAF7F2] mb-2">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-xs font-semibold text-[#223B28] truncate">{p.name}</h4>
                      <span className="text-xs font-bold text-[#2E4D34] mt-1 block">{formatRupees(p.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. PROFILE TAB */}
            {currentTab === 'profile' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs space-y-6">
                <h2 className="font-serif text-xl font-bold text-[#223B28] pb-3 border-b border-[#ECE7DD]">
                  Personal Profile & Account Settings
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[#6C7B6D] block mb-1">Full Name</label>
                    <input
                      type="text"
                      disabled
                      value={user?.name || 'Ananya Sharma'}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#ECE7DD] text-[#223B28] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[#6C7B6D] block mb-1">Email ID</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'ananya@example.com'}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#ECE7DD] text-[#223B28] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[#6C7B6D] block mb-1">Mobile Phone</label>
                    <input
                      type="text"
                      disabled
                      value={`+91 ${user?.phone || '9876543210'}`}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAF7F2] border border-[#ECE7DD] text-[#223B28] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[#6C7B6D] block mb-1">Account Tier</label>
                    <div className="px-3.5 py-2 rounded-xl bg-[#EAF1EA] border border-[#D5E5D3] text-[#2E4D34] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verified Chilly Patron</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default BuyerAccountPage;
