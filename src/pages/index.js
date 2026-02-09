import { useState, useEffect, useMemo, useCallback } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/Avatar";
import LoanForm from "@/components/LoanForm";
import { STATUS_OPTIONS, CLOSED_STATUSES, LOAN_TYPES, fmtDate, fmtCurrency, ROLES } from "@/lib/constants";

export default function Dashboard() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProcessor, setFilterProcessor] = useState("All");
  const [showClosed, setShowClosed] = useState(false);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const [editLoan, setEditLoan] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  // Track whether auth session has been checked
  const [authReady, setAuthReady] = useState(false);

  // Listen for auth state to be determined
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthReady(true);
      if (!session) {
        setLoading(false);
      }
    });
    // Also check current session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthReady(true);
      if (!session) {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  // Redirect to login if not authenticated (once auth is determined)
  useEffect(() => {
    if (authReady && !user) router.push("/login");
  }, [user, authReady, router]);

  // Fetch profile + all profiles + loans
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: me }, { data: allProfiles }, { data: allLoans }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("profiles").select("*").order("full_name"),
        supabase.from("loans").select("*").order("created_at", { ascending: false }),
      ]);
      setProfile(me);
      setProfiles(allProfiles || []);
      setLoans(allLoans || []);
      setLoading(false);
    };
    load();
  }, [user, supabase]);

  // Realtime subscription for loans
  useEffect(() => {
    const channel = supabase
      .channel("loans-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setLoans(prev => [payload.new, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setLoans(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
        } else if (payload.eventType === "DELETE") {
          setLoans(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const processors = useMemo(() => profiles.filter(p => p.role === "Processor"), [profiles]);
  const canEdit = profile?.role === "Lender" || profile?.role === "Processor";
  const isLender = profile?.role === "Lender";

  const getProfile = useCallback((id) => profiles.find(p => p.id === id), [profiles]);

  // Filtering, searching, sorting
  const visibleLoans = useMemo(() => {
    let list = [...loans];
    if (!showClosed) list = list.filter(l => !CLOSED_STATUSES.includes(l.status));
    if (filterStatus !== "All") list = list.filter(l => l.status === filterStatus);
    if (filterProcessor !== "All") list = list.filter(l => l.processor_id === filterProcessor);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(l =>
        l.borrower.toLowerCase().includes(s) ||
        l.loan_type.toLowerCase().includes(s) ||
        (l.notes || "").toLowerCase().includes(s)
      );
    }
    if (sortCol) {
      list.sort((a, b) => {
        let va = a[sortCol], vb = b[sortCol];
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === "string") { va = va.toLowerCase(); vb = (vb || "").toLowerCase(); }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [loans, showClosed, filterStatus, filterProcessor, search, sortCol, sortDir]);

  const stats = useMemo(() => {
    const active = loans.filter(l => !CLOSED_STATUSES.includes(l.status));
    const funded = loans.filter(l => l.status === "Funded" || l.status === "Paid");
    return {
      active: active.length,
      funded: funded.length,
      volume: active.reduce((s, l) => s + Number(l.amount || 0), 0),
      total: loans.length,
    };
  }, [loans]);

  const handleSave = async (form) => {
    // Clean empty strings to null for date fields
    const cleanDates = (obj) => {
      const dateFields = ["lock_exp", "sub_date", "cr_date", "coe_date"];
      const cleaned = { ...obj };
      dateFields.forEach(f => { if (!cleaned[f]) cleaned[f] = null; });
      if (!cleaned.processor_id) cleaned.processor_id = null;
      return cleaned;
    };
    const payload = cleanDates(form);

    if (editLoan) {
      const { id, created_at, updated_at, created_by, ...updates } = payload;
      await supabase.from("loans").update(updates).eq("id", editLoan.id);
      await supabase.from("activity_log").insert({
        loan_id: editLoan.id, user_id: user.id,
        action: "updated", details: `Updated loan for ${form.borrower}`,
      });
    } else {
      payload.created_by = user.id;
      const { data } = await supabase.from("loans").insert(payload).select().single();
      if (data) {
        await supabase.from("activity_log").insert({
          loan_id: data.id, user_id: user.id,
          action: "created", details: `Created loan for ${form.borrower}`,
        });
      }
    }
    setEditLoan(null);
    setShowAdd(false);
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Loading LoanPilot...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Header */}
      <header className="bg-slate-900 text-white px-8 flex items-center justify-between h-[60px] sticky top-0 z-50">
        <div className="flex items-center gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-extrabold">LP</div>
          <span className="text-[17px] font-bold tracking-tight">LoanPilot</span>
          <span className="text-[11px] px-2 py-0.5 bg-white/10 rounded-full font-medium ml-1">Pipeline Tracker</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/[.08] px-3.5 py-1.5 rounded-lg">
            <Avatar name={profile.full_name} color={profile.color || "#2563eb"} size={26} />
            <div>
              <div className="text-sm font-semibold leading-tight">{profile.full_name}</div>
              <div className="text-[10px] text-slate-400">{profile.role}</div>
            </div>
          </div>
          <button onClick={handleSignOut} className="text-xs text-slate-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </header>

      <div className="max-w-[1320px] mx-auto px-7 py-6 pb-16">
        {/* Role notice */}
        {profile.role === "Processor" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2.5 text-sm text-blue-800">
            🔒 You're viewing only loans assigned to you.
          </div>
        )}
        {profile.role === "Assistant" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2.5 text-sm text-amber-800">
            👁️ Read-only view. You can see all loans but cannot edit.
          </div>
        )}

        {/* KPIs */}
        <div className="flex gap-3.5 mb-6 flex-wrap">
          {[
            { label: "Active Loans", value: stats.active, sub: `of ${stats.total} total` },
            { label: "Pipeline Volume", value: fmtCurrency(stats.volume), sub: "active loans" },
            { label: "Funded / Paid", value: stats.funded },
            { label: "Team Members", value: profiles.length, sub: `${processors.length} processors` },
          ].map((k, i) => (
            <div key={i} className="px-5 py-4 bg-white rounded-xl border border-slate-200 min-w-[140px]">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{k.label}</div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{k.value}</div>
              {k.sub && <div className="text-xs text-slate-400 mt-0.5">{k.sub}</div>}
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex gap-2.5 mb-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[15px]">⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search borrower, type, notes..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white min-w-[140px]">
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          {isLender && (
            <select value={filterProcessor} onChange={e => setFilterProcessor(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none bg-white min-w-[140px]">
              <option value="All">All Processors</option>
              {processors.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-500 cursor-pointer whitespace-nowrap">
            <input type="checkbox" checked={showClosed} onChange={e => setShowClosed(e.target.checked)} className="accent-blue-600" />
            Show closed
          </label>
          {isLender && (
            <button onClick={() => setShowAdd(true)} className="px-5 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-base leading-none">+</span> Add Loan
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  {[
                    { key: "borrower", label: "Borrower" },
                    { key: "amount", label: "Amount" },
                    { key: "purpose", label: "Type" },
                    { key: "loan_type", label: "Product" },
                    { key: "locked", label: "Lock" },
                    { key: "processor_id", label: "Processor" },
                    { key: "status", label: "Status" },
                    { key: "coe_date", label: "COE" },
                    { key: null, label: "" },
                  ].map((col, i) => (
                    <th key={i} onClick={() => col.key && handleSort(col.key)}
                      className="px-3.5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap select-none"
                      style={{ cursor: col.key ? "pointer" : "default" }}>
                      {col.label}
                      {col.key && sortCol === col.key && <span className="text-[10px]"> {sortDir === "asc" ? "↑" : "↓"}</span>}
                      {col.key && sortCol !== col.key && <span className="text-[10px] opacity-30"> ↕</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLoans.length === 0 && (
                  <tr><td colSpan={9} className="py-10 text-center text-slate-400">No loans match your filters.</td></tr>
                )}
                {visibleLoans.map(loan => {
                  const proc = getProfile(loan.processor_id);
                  const isExpiringSoon = loan.lock_exp && new Date(loan.lock_exp) < new Date(Date.now() + 7 * 86400000) && new Date(loan.lock_exp) > new Date();
                  const isExpired = loan.lock_exp && new Date(loan.lock_exp) < new Date();
                  return (
                    <tr key={loan.id} onClick={() => setSelectedLoan(loan)}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="px-3.5 py-3 font-semibold">
                        <div>{loan.borrower}</div>
                        <div className="text-[11px] text-slate-400 font-normal">{loan.id.slice(0, 8)}</div>
                      </td>
                      <td className="px-3.5 py-3 tabular-nums font-medium">{fmtCurrency(loan.amount)}</td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${loan.purpose === "Purchase" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                          {loan.purpose}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-500">{loan.loan_type}</td>
                      <td className="px-3.5 py-3">
                        {loan.locked ? (
                          <div>
                            <span className="text-green-600 font-semibold text-xs">🔒 Yes</span>
                            {loan.lock_exp && (
                              <div className={`text-[11px] ${isExpired ? "text-red-600 font-semibold" : isExpiringSoon ? "text-amber-600 font-semibold" : "text-slate-400"}`}>
                                {isExpired ? "EXPIRED " : ""}{fmtDate(loan.lock_exp)}
                              </div>
                            )}
                          </div>
                        ) : <span className="text-slate-400 text-xs">—</span>}
                      </td>
                      <td className="px-3.5 py-3">
                        {proc ? (
                          <div className="flex items-center gap-2">
                            <Avatar name={proc.full_name} color={proc.color || "#7c3aed"} size={24} />
                            <span className="text-xs font-medium">{proc.full_name}</span>
                          </div>
                        ) : <span className="text-slate-400 text-xs">Unassigned</span>}
                      </td>
                      <td className="px-3.5 py-3"><StatusBadge status={loan.status} /></td>
                      <td className="px-3.5 py-3 text-slate-500 text-xs">{fmtDate(loan.coe_date)}</td>
                      <td className="px-3.5 py-3">
                        {canEdit && (
                          <button onClick={e => { e.stopPropagation(); setEditLoan(loan); }}
                            className="border border-slate-200 rounded px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 font-medium">
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400">
            <span>Showing {visibleLoans.length} of {loans.length} loans</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Realtime sync active
            </span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && <LoanForm processors={processors} onSave={handleSave} onCancel={() => setShowAdd(false)} />}
      {editLoan && <LoanForm loan={editLoan} processors={processors} onSave={handleSave} onCancel={() => setEditLoan(null)} />}

      {/* Detail drawer */}
      {selectedLoan && !editLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setSelectedLoan(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[88vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 pt-5">
              <h2 className="text-lg font-bold text-slate-900">Loan Detail</h2>
              <button onClick={() => setSelectedLoan(null)} className="text-slate-400 text-xl hover:text-slate-600">&times;</button>
            </div>
            <div className="px-6 pb-6 pt-4">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="text-xl font-extrabold tracking-tight">{selectedLoan.borrower}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{selectedLoan.id.slice(0, 8)} · {selectedLoan.purpose} · {selectedLoan.loan_type}</div>
                </div>
                <StatusBadge status={selectedLoan.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 mb-5">
                {[
                  ["Amount", fmtCurrency(selectedLoan.amount)],
                  ["Processor", (() => { const p = getProfile(selectedLoan.processor_id); return p ? p.full_name : "Unassigned"; })()],
                  ["Lock", selectedLoan.locked ? `Yes${selectedLoan.lock_exp ? " — " + fmtDate(selectedLoan.lock_exp) : ""}` : "No"],
                  ["COE", fmtDate(selectedLoan.coe_date) || "—"],
                  ["Submitted", fmtDate(selectedLoan.sub_date) || "—"],
                  ["Cond. Approval", fmtDate(selectedLoan.cr_date) || "—"],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
                    <div className="text-sm font-medium mt-0.5">{val}</div>
                  </div>
                ))}
              </div>
              {selectedLoan.notes && (
                <div className="px-4 py-3 bg-slate-50 rounded-xl text-sm text-slate-600 leading-relaxed">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</div>
                  {selectedLoan.notes}
                </div>
              )}
              {canEdit && (
                <button onClick={() => { setEditLoan(selectedLoan); setSelectedLoan(null); }}
                  className="w-full mt-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                  Edit Loan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
