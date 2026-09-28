import type { HTMLAttributes, TableHTMLAttributes } from "react";

export function TableContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`ds-table-container ${className}`.trim()} {...props} />; }
export function Table({ className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) { return <table className={`ds-table ${className}`.trim()} {...props} />; }
