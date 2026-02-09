import { useState } from "react";
import { STATUS_OPTIONS, LOAN_TYPES } from "@/lib/constants";

export default function LoanForm({ loan, processors, onSave, onCancel }) {
  const [form, setForm] = useState(loan || {
    borrower: "", amount: "", loan_type: "Conventional", purpose: "Purchase",
    locked: false, lock_exp: "", processor_id: "", sub_date: "", cr_date: "",
    coe_date: "", status: "Active", notes: "",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-xl mx-4 max-h-[88vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-6 pt-5">
          <h2 className="text-lg font-bold text-slate-900">{loan ? `Edit — ${loan.borrower}` : "Add New Loan"}</h2>
          <button onClick={onCancel} className="text-slate-400 text-xl hover:text-slate-600 leading-none">&times;</button>
        </div>
        <div className="px-6 pb-6 pt-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Borrower Name</label>
              <input className={inputCls} value={form.borrower} onChange={e => set("borrower", e.target.value)} placeholder="Full Name" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Loan Amount</label>
              <input className={inputCls} type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Purpose</label>
              <select className={inputCls} value={form.purpose} onChange={e => set("purpose", e.target.value)}>
                <option>Purchase</option><option>Refi</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Loan Type</label>
              <select className={inputCls} value={form.loan_type} onChange={e => set("loan_type", e.target.value)}>
                {LOAN_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Processor</label>
              <select className={inputCls} value={form.processor_id || ""} onChange={e => set("processor_id", e.target.value || null)}>
                <option value="">Unassigned</option>
                {processors.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</label>
              <select className={inputCls} value={form.status} onChange={e => set("status", e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Locked?</label>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" checked={form.locked} onChange={e => set("locked", e.target.checked)} className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-slate-500">{form.locked ? "Yes" : "No"}</span>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Lock Expiration</label>
              <input className={inputCls} type="date" value={form.lock_exp || ""} onChange={e => set("lock_exp", e.target.value || null)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Submitted</label>
              <input className={inputCls} type="date" value={form.sub_date || ""} onChange={e => set("sub_date", e.target.value || null)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Conditional Approval</label>
              <input className={inputCls} type="date" value={form.cr_date || ""} onChange={e => set("cr_date", e.target.value || null)} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">COE / Closing</label>
              <input className={inputCls} type="date" value={form.coe_date || ""} onChange={e => set("coe_date", e.target.value || null)} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</label>
            <textarea className={inputCls + " min-h-[60px] resize-y"} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-3 justify-end mt-5">
            <button onClick={onCancel} className="px-5 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={() => onSave(form)} className="px-6 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">Save Loan</button>
          </div>
        </div>
      </div>
    </div>
  );
}
