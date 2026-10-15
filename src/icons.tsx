import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number };
const Icon = ({ size = 20, children, ...props }: Props) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>
);

export const Icons = {
  Menu: (p: Props) => <Icon {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Icon>,
  ChevronLeft: (p: Props) => <Icon {...p}><path d="m15 18-6-6 6-6" /></Icon>,
  ChevronRight: (p: Props) => <Icon {...p}><path d="m9 18 6-6-6-6" /></Icon>,
  DoubleLeft: (p: Props) => <Icon {...p}><path d="m13 17-5-5 5-5M19 17l-5-5 5-5" /></Icon>,
  ChevronDown: (p: Props) => <Icon {...p}><path d="m7 10 5 5 5-5" /></Icon>,
  User: (p: Props) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Icon>,
  Users: (p: Props) => <Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Icon>,
  File: (p: Props) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></Icon>,
  Process: (p: Props) => <Icon {...p}><path d="M8 7h8M8 17h8M5 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM23 17a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/><path d="M3 9v4a4 4 0 0 0 4 4h11M21 15V9a4 4 0 0 0-4-4H6"/></Icon>,
  Calendar: (p: Props) => <Icon {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></Icon>,
  Briefcase: (p: Props) => <Icon {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></Icon>,
  Stethoscope: (p: Props) => <Icon {...p}><path d="M6 3v5a5 5 0 0 0 10 0V3M4 3h4M14 3h4"/><path d="M11 13v2a4 4 0 0 0 8 0v-1"/><circle cx="19" cy="11" r="2"/></Icon>,
  Pencil: (p: Props) => <Icon {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></Icon>,
  Trash: (p: Props) => <Icon {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></Icon>,
  Chart: (p: Props) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></Icon>,
  Message: (p: Props) => <Icon {...p}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 9h8M8 13h5"/></Icon>,
  Settings: (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.64 15 1.7 1.7 0 0 0 3.08 14H3v-4h.08A1.7 1.7 0 0 0 4.64 9 1.7 1.7 0 0 0 4.3 7.12l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.64h.02A1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15 4.64a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.36 9v.02A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></Icon>,
  Bell: (p: Props) => <Icon {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></Icon>,
  Mail: (p: Props) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Icon>,
  Lock: (p: Props) => <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>,
  Search: (p: Props) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Icon>,
  Filter: (p: Props) => <Icon {...p}><path d="M4 6h16M7 12h10M10 18h4"/></Icon>,
  Eye: (p: Props) => <Icon {...p}><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>,
  Plus: (p: Props) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  External: (p: Props) => <Icon {...p}><path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></Icon>,
  Clock: (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>,
  Check: (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></Icon>,
  X: (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/></Icon>,
  Hourglass: (p: Props) => <Icon {...p}><path d="M6 2h12M6 22h12M8 2v4c0 2 4 4 4 6s-4 4-4 6v4M16 2v4c0 2-4 4-4 6s4 4 4 6v4"/></Icon>,
  ShieldCheck: (p: Props) => <Icon {...p}><path d="M12 3 5 6v5c0 4.8 2.9 8.2 7 10 4.1-1.8 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></Icon>,
  Logout: (p: Props) => <Icon {...p}><path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 4h4a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-4"/></Icon>,
  Upload: (p: Props) => <Icon {...p}><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 15v4h14v-4"/></Icon>,
  Moon: (p: Props) => <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></Icon>,
  Sun: (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Icon>,
  Close: (p: Props) => <Icon {...p}><path d="m6 6 12 12M18 6 6 18"/></Icon>
};
