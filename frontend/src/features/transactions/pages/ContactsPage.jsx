import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Plus, Trash2, ShieldCheck, Check, Search, BookUser } from "lucide-react";
import { toast } from "react-hot-toast";
import { PageLoader } from "@/shared/components/Loader";
import api from "@/shared/services/api";
import { ENDPOINTS } from "@/shared/constants";
import { motion, AnimatePresence } from "framer-motion";

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [search, setSearch]     = useState("");

  const [form, setForm] = useState({ name: "", accountNumber: "", nickname: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchContacts(); }, []);

  const fetchContacts = async () => {
    try {
      const res = await api.get(ENDPOINTS.CONTACTS);
      setContacts(res.data.contacts);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.accountNumber) return;
    setSaving(true);
    try {
      const res = await api.post(ENDPOINTS.CONTACTS, form);
      setContacts((prev) => [...prev, res.data.contact].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Contact added");
      setForm({ name: "", accountNumber: "", nickname: "" });
      setShowAdd(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`${ENDPOINTS.CONTACTS}/${id}`);
      setContacts((prev) => prev.filter((c) => c._id !== id));
      toast.success("Contact removed");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to remove contact");
    }
  };

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.nickname.toLowerCase().includes(search.toLowerCase()) ||
      c.accountNumber.includes(search)
  );

  if (loading) return <PageLoader />;

  return (
    <div className="font-sans text-slate-900 pb-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold m-0 flex items-center gap-2">
            <BookUser size={24} className="text-blue-600" /> Contacts Book
          </h1>
          <p className="text-[13px] text-slate-500 mt-1 m-0">Manage your frequent recipients</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-semibold rounded-xl transition-colors border-none cursor-pointer shadow-sm shadow-blue-200"
        >
          <Plus size={14} strokeWidth={2.5} /> Add Contact
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="bg-white border border-slate-200 rounded-[14px] p-5 mb-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="E.g., Jane Doe"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Account Number</label>
                  <input
                    required
                    type="text"
                    placeholder="10-digit account"
                    value={form.accountNumber}
                    onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Nickname (Optional)</label>
                  <input
                    type="text"
                    placeholder="E.g., Landlord"
                    value={form.nickname}
                    onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-[13px] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[13px] rounded-lg border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Contact"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-slate-200 rounded-[14px] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-300"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <BookUser className="text-slate-400" size={20} />
            </div>
            <p className="text-[14px] font-semibold text-slate-700 m-0 mb-1">No contacts found</p>
            <p className="text-[13px] text-slate-500 m-0 max-w-xs mx-auto">
              {search ? "Try adjusting your search terms" : "You haven't added any contacts yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((contact) => (
              <div key={contact._id} className="flex items-center gap-4 p-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-bold text-[14px] shrink-0">
                  {contact.avatar || contact.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 m-0 text-[14px] truncate flex items-center gap-2">
                    {contact.name}
                    {contact.nickname && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        {contact.nickname}
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-slate-500 m-0 text-[12px] truncate mt-0.5">
                    {contact.accountNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    to={`/send?to=${contact.accountNumber}`}
                    className="hidden sm:inline-flex px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-semibold rounded-lg no-underline transition-colors"
                  >
                    Send Money
                  </Link>
                  <button
                    onClick={() => handleDelete(contact._id)}
                    className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border-none cursor-pointer transition-colors"
                    title="Remove Contact"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
