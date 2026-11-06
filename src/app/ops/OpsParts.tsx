// Thành phần nhỏ dùng chung của các màn vận hành.
import type { ReactNode } from 'react';
import { CATEGORY_LABEL, STATUS_LABEL } from './opsApi';

const STATUS_TONE: Record<string, string> = { New: 'info', InProgress: 'info', WaitingCustomer: 'warn', Escalated: 'bad', Resolved: 'good', Closed: '' };
const PRIORITY_TONE: Record<string, string> = { P1: 'bad', P2: 'warn', P3: '' };

export const StatusBadge = ({ value }: { value: string }) => <span className={`fm-badge ${STATUS_TONE[value] ?? ''}`}>{STATUS_LABEL[value] ?? value}</span>;
export const PriorityBadge = ({ value }: { value: string }) => <span className={`fm-badge ${PRIORITY_TONE[value] ?? ''}`}>{value}</span>;
export const CategoryText = ({ value }: { value: string }) => <>{CATEGORY_LABEL[value] ?? value}</>;

export const SelectFilter = ({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) =>
  <label>{label}<select value={value} onChange={e => onChange(e.target.value)}><option value="">Tất cả</option>{options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}</select></label>;

export const Stat = ({ label, value, tone }: { label: string; value: ReactNode; tone?: 'bad' }) =>
  <div className="fm-stat"><span>{label}</span><strong style={tone === 'bad' ? { color: 'var(--danger)' } : undefined}>{value}</strong></div>;
