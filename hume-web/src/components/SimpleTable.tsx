import { ReactNode } from 'react';
import { typography } from '@/styles/typography';

interface SimpleTableProps {
  headers: string[];
  children: ReactNode;
}

interface SimpleTableRowProps {
  children: ReactNode;
}

export const SimpleTableRow = ({ children }: SimpleTableRowProps) => (
  <tr className="border-t border-solid border-neutral-border">
    {children}
  </tr>
);

export const SimpleTableCell = ({ children }: { children: ReactNode }) => (
  <td>
    <div className="flex h-12 w-full items-center gap-1 px-3">
      {children}
    </div>
  </td>
);

export const SimpleTable = ({ headers, children }: SimpleTableProps) => {
  return (
    <table className="w-full">
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={index}>
              <div className="flex h-8 w-full items-center gap-1 px-3">
                <span className={typography.tableHeader}>
                  {header}
                </span>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="border-b border-solid border-neutral-border">
        {children}
      </tbody>
    </table>
  );
}; 