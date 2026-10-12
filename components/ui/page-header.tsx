import type { ReactNode } from "react";

type BreadcrumbItem = { label: string; href?: string };

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
};

export function PageHeader({ title, description, breadcrumb, actions, eyebrow, className = "" }: PageHeaderProps) {
  return (
    <header className={`page-header ui-page-header ${className}`}>
      <div className="ui-page-header-copy">
        {breadcrumb?.length ? (
          <nav aria-label="Fil d’Ariane" className="ui-breadcrumb">
            {breadcrumb.map((item, index) => (
              <span key={`${item.label}-${index}`} className="ui-breadcrumb-item">
                {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
                {index < breadcrumb.length - 1 ? <span aria-hidden="true">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <p className="ui-eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="ui-page-header-description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export type { BreadcrumbItem, PageHeaderProps };
export default PageHeader;

export { PageHeader as EnterprisePageHeader };

