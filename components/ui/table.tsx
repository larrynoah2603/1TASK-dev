import type { HTMLAttributes, TableHTMLAttributes } from "react";

export function TableContainer({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={`kit-table-wrap ds-table-container ${className}`.trim()} {...props} />; }
export function Table({ className = "", ...props }: TableHTMLAttributes<HTMLTableElement>) { return <table className={`kit-table ds-table ${className}`.trim()} {...props} />; }
