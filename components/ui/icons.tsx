import type { SVGProps } from "react";

/** Source unique des icônes (trait 1.8, viewBox 24). Remplace les jeux d'icônes dupliqués dans les shells. */
const PATHS = {
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  ticket: "M4 6.5h16v4a2 2 0 0 0 0 3v4H4v-4a2 2 0 0 0 0-3v-4ZM9 9.5h6M9 14.5h4",
  inbox: "M4 5.5h16v13H4zM4 14h4l1.5 2h5L16 14h4M8 9h8",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 12h16M10 12v2h4v-2",
  layers: "M12 3 3 8l9 5 9-5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5",
  users: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5A3 3 0 1 0 10 4.5a3 3 0 0 0 0 6ZM16 5a3 3 0 0 1 0 5.8M17 14.2a3.5 3.5 0 0 1 3 3.3V19",
  folder: "M3 6.5h7l2 2h9v10H3zM3 9h18",
  book: "M4 4.5h6A2 2 0 0 1 12 6.5v13a2 2 0 0 0-2-2H4zM20 4.5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z",
  chart: "M4 19V9M10 19V5M16 19v-7M22 19H2",
  monitor: "M4 5h16v11H4zM8 20h8M12 16v4",
  shield: "M12 3 19 6v5.5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5V6l7-3ZM9 12l2 2 4-4",
  sliders: "M4 7h8M16 7h4M4 17h4M12 17h8M14 5v4M10 15v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0",
  userPlus: "M15 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-4A3.5 3.5 0 0 0 4 18.5V20M9.5 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 8v6M16 11h6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-7-3-9M10 21h4",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.3-4.3",
  plus: "M12 5v14M5 12h14",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.3a2.5 2.5 0 1 1 4.3 1.8c-.9.8-1.9 1.2-1.9 2.6M12 17h.01",
  menu: "M4 7h16M4 12h16M4 17h16",
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 5 5 9-10",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 4.5-5",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  alertTriangle: "M12 4 3 20h18L12 4ZM12 10v4M12 17h.01",
  alertCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v5M12 16h.01",
  message: "M4 5h16v11H9l-5 4V5Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  logout: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  refresh: "M20 11a8 8 0 0 0-14.5-4M4 4v4h4M4 13a8 8 0 0 0 14.5 4M20 20v-4h-4",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  tag: "M4 4h8l8 8-8 8-8-8V4ZM8 8h.01",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  paperclip: "m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8",
  home: "M3 10.5 12 3l9 7.5M5.5 9v10h13V9M9 19v-5h6v5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "", ...props }: { name: IconName } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg aria-hidden="true" className={`kit-icon ${className}`.trim()} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d={PATHS[name]} />
    </svg>
  );
}
