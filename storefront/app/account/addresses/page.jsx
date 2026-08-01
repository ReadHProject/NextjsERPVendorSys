"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toaster";
import { LoadingAnimation } from "@/components/ui/loading-animation";
export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    try {
      const res = await api.get("/account/addresses");
      if (res && Array.isArray(res)) {
        setAddresses(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/account/addresses", form);
      await fetchAddresses();
      setModalOpen(false);
      setForm({
        fullName: "", phone: "", addressLine1: "", addressLine2: "",
        city: "", state: "", pincode: "", isDefault: false
      });
      toast.success("Address added successfully");
    } catch (err) {
      toast.error(err.message || "Failed to add address");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-xl font-bold">My Addresses</h2>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-[#E92B58] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#d6244e] transition-colors"
        >
          <Icon name="plus" size={16} /> Add New Address
        </button>
      </div>

      <div className="p-6">
        {loading ? (
           <LoadingAnimation type="spinner" />
        ) : addresses.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="map-pin" className="text-[#E92B58]" size={24} />
            </div>
            <p className="text-muted-foreground">No addresses saved yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map(addr => (
              <div key={addr.id} className="border border-gray-200 rounded-xl p-4 relative">
                {addr.isDefault && (
                  <span className="absolute top-4 right-4 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Default</span>
                )}
                <h3 className="font-bold text-gray-900 mb-1">{addr.fullName}</h3>
                <p className="text-sm text-gray-600 mb-2">{addr.phone}</p>
                <p className="text-sm text-gray-600">
                  {addr.addressLine1}
                  {addr.addressLine2 && <><br/>{addr.addressLine2}</>}
                  <br/>{addr.city}, {addr.state} {addr.pincode}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center gap-4">
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-900"><Icon name="arrow-left" size={20} /></button>
              <h2 className="text-xl font-bold">Add New Address</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name</label>
                  <input required name="fullName" value={form.fullName} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Phone</label>
                  <input required name="phone" value={form.phone} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Address Line 1</label>
                <input required name="addressLine1" placeholder="House No, Building, Street" value={form.addressLine1} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Address Line 2 (Optional)</label>
                <input name="addressLine2" placeholder="Area, Landmark" value={form.addressLine2} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">City</label>
                  <input required name="city" value={form.city} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Pincode</label>
                  <input required name="pincode" value={form.pincode} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">State</label>
                  <select required name="state" value={form.state} onChange={handleChange} className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:border-[#E92B58] bg-white">
                    <option value="">Select State</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="West Bengal">West Bengal</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="isDefault" checked={form.isDefault} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-[#E92B58] focus:ring-[#E92B58]" />
                <span className="text-sm text-gray-700">Make this my default address</span>
              </label>

              <button disabled={saving} type="submit" className="w-full bg-[#E92B58] text-white font-bold py-4 rounded-xl hover:bg-[#d6244e] transition-colors disabled:opacity-50 mt-4">
                {saving ? "Saving..." : "Save Address"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
