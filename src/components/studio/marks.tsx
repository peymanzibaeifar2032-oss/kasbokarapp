import type { ReactNode, SVGProps } from "react";

export type MarkName =
  | "studio"
  | "today"
  | "jobs"
  | "inbox"
  | "money"
  | "goals"
  | "more"
  | "contacts"
  | "wait"
  | "consent"
  | "club"
  | "apprentice"
  | "messages"
  | "artists"
  | "request"
  | "status"
  | "open"
  | "care"
  | "guide"
  | "designs"
  | "bell"
  | "upload"
  | "check";

export function Mark({ name, ...props }: { name: MarkName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      {draw[name]}
    </svg>
  );
}

const teal = { fill: "#2F6F68", stroke: "none" } as const;

const draw: Record<MarkName, ReactNode> = {
  studio: (
    <>
      <circle cx="8" cy="16.5" r="3" {...teal} />
      <path d="M16.5 4.5 9.2 15" />
      <path d="M13.2 6.2 17.8 8" />
    </>
  ),
  today: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M4 10h16" />
    </>
  ),
  jobs: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M9 15l2 2 4-4" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 13 6.5 6h11L20 13v6H4v-6z" />
      <path d="M4 13h4.5a3.5 3.5 0 0 0 7 0H20" />
    </>
  ),
  money: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.25" />
    </>
  ),
  goals: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  more: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
    </>
  ),
  contacts: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5.5 19.5c1.2-3 3.4-4.5 6.5-4.5s5.3 1.5 6.5 4.5" />
    </>
  ),
  wait: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 2" />
    </>
  ),
  consent: (
    <>
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5V8h4M9 13h6M9 16.5h4" />
    </>
  ),
  club: (
    <>
      <path d="M12 19s-6.5-3.8-6.5-8A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 6.5 3c0 4.2-6.5 8-6.5 8z" />
    </>
  ),
  apprentice: (
    <>
      <path d="M14.5 5.5 18.5 9.5 9 19H5v-4z" />
      <path d="M13 7 17 11" />
    </>
  ),
  messages: (
    <>
      <path d="M5 6.5h14v9H8l-3 3z" />
    </>
  ),
  artists: (
    <>
      <circle cx="9" cy="9" r="2.4" />
      <circle cx="16" cy="9.5" r="2" />
      <path d="M4.5 18c.8-2.4 2.4-3.5 4.5-3.5s3.7 1.1 4.5 3.5" />
      <path d="M14 14.6c1.3-.4 2.6-.2 3.8.8.8 1.2 1.3 2 1.7 2.6" />
    </>
  ),
  request: (
    <>
      <path d="M14 5.5 18.5 10 9 19.5H4.5V15z" />
      <path d="M12.5 7 17 11.5" />
    </>
  ),
  status: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v4M16 3.5v4M12 12v3" />
      <circle cx="12" cy="16.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  open: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    </>
  ),
  care: (
    <>
      <path d="M12 4.5s5.5 5 5.5 8.5a5.5 5.5 0 0 1-11 0C6.5 9.5 12 4.5 12 4.5z" />
    </>
  ),
  guide: (
    <>
      <path d="M5 5.5h6.5A2.5 2.5 0 0 1 14 8v11.5H7.5A2.5 2.5 0 0 0 5 17z" />
      <path d="M14 8a2.5 2.5 0 0 1 2.5-2.5H19V17a2.5 2.5 0 0 0-2.5-2.5H14" />
    </>
  ),
  designs: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m4 16 4.5-4 3 2.5L15 11l5 5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5h12l-1.2-2V11a4.8 4.8 0 0 0-9.6 0v3.5z" />
      <path d="M10 16.5a2 2 0 0 0 4 0" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V6" />
      <path d="m8 9 4-4 4 4" />
      <path d="M5 19h14" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="m8.5 12.2 2.3 2.3 4.7-5" />
    </>
  ),
};
