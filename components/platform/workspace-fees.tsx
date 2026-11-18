'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Check, Search } from 'lucide-react'
import { DemoKpis, DemoModuleShell } from './demo-module-shell'
import { WorkspaceDialog } from './workspace-dialog'
import { useWorkspace } from './workspace-state'
import { money } from '@/lib/demo-workspace'
import { getPlatformModule } from '@/lib/demo-platform'
import s from './workspace.module.css'

function FeesWorkspace() {
  const params = useSearchParams()
  const { invoices, recordPayment } = useWorkspace()
  const [filter, setFilter] = useState(params.get('status') || 'all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(12)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const statusParam = params.get('status') || 'all'
  useEffect(() => { setFilter(statusParam); setLimit(12) }, [statusParam])
  const selected = invoices.find(item => item.id === selectedId)
  const rows = invoices.filter(item => (filter === 'all' || item.status === filter) && `${item.id} ${item.student} ${item.course}`.toLowerCase().includes(query.toLowerCase().trim()))
  const paid = invoices.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
  const pending = invoices.filter(item => item.status === 'pending')
  return <DemoModuleShell module={getPlatformModule('fees')!}><DemoKpis items={[{ label: 'Fees collected · all time', value: money(paid) }, { label: 'Outstanding balance', value: money(pending.reduce((sum, item) => sum + item.amount, 0)) }, { label: 'Pending invoices', value: String(pending.length) }]} />
    <div className={s.toolbar}><div className={s.searchField}><Search size={17} /><input type="search" aria-label="Search invoices" placeholder="Search invoice or learner…" value={query} onChange={event => { setQuery(event.target.value); setLimit(12) }} /></div><div className={s.filters} role="group" aria-label="Invoice status">{['all', 'paid', 'pending', 'refunded', 'cancelled'].map(value => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(12) }}>{value.charAt(0).toUpperCase() + value.slice(1)}</button>)}</div></div>
    <div className={s.tableWrap}>{rows.length ? <table className={s.table}><thead><tr><th scope="col">Invoice</th><th scope="col">Learner</th><th scope="col">Course</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col"><span className={s.srOnly}>Invoice details</span></th></tr></thead><tbody>{rows.slice(0, limit).map(invoice => <tr key={invoice.id}><td>{invoice.id}</td><td>{invoice.student}</td><td className={s.courseCell}>{invoice.course}</td><td>{money(invoice.amount)}</td><td><span className={s.status} data-tone={invoice.status === 'pending' ? 'blue' : 'green'}>{invoice.status}</span></td><td><button className={s.iconButton} aria-label={`Open invoice ${invoice.id}`} onClick={() => setSelectedId(invoice.id)}><ArrowRight size={16} /></button></td></tr>)}</tbody></table> : <div className={s.empty}><h3>No invoices in this view.</h3><p>Try another search or status.</p><button className={s.textButton} onClick={() => { setQuery(''); setFilter('all') }}>Clear filters</button></div>}</div>
    <div className={s.toolbar}><p className={s.count} role="status">Showing {Math.min(limit, rows.length)} of {rows.length} sample invoices</p>{limit < rows.length && <button className={s.secondary} onClick={() => setLimit(value => value + 12)}>Show more invoices</button>}</div>
    <WorkspaceDialog title={selected?.id || 'Invoice'} description="Sample invoice · No real payment is taken" open={!!selected} onClose={() => setSelectedId(null)}>{selected && <><dl className={s.recordFacts}><div><dt>Learner</dt><dd>{selected.student}</dd></div><div><dt>Amount</dt><dd>{money(selected.amount)}</dd></div><div><dt>Course</dt><dd>{selected.course}</dd></div><div><dt>Status</dt><dd aria-live="polite"><span className={s.status}>{selected.status}</span></dd></div></dl>{selected.status === 'pending' ? <button className={s.primary} onClick={() => recordPayment(selected.id)}>Simulate payment <ArrowRight size={16} /></button> : selected.status === 'paid' && <p className={s.notice}><Check size={16} />Payment recorded in this sample workspace.</p>}</>}</WorkspaceDialog>
  </DemoModuleShell>
}
export function WorkspaceFees() { return <Suspense fallback={<p>Opening fee records…</p>}><FeesWorkspace /></Suspense> }
