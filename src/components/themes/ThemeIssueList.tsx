import { AlertTriangle } from "lucide-react";
import { cn } from "cn";

import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";

/**
 * Props for {@link ThemeIssueList}.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemeIssueList issues={review.issues} />
 * ```
 */
export interface ThemeIssueListProps {
  issues: ThemeIssue[];
}

/**
 * The issues a theme package produced, each with its code and source
 * location. Errors are destructive, warnings muted, and info issues are left
 * to tools.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```tsx
 * <ThemeIssueList issues={review.issues} />
 * ```
 */
export function ThemeIssueList({ issues }: ThemeIssueListProps) {
  const shown = issues.filter((issue) => issue.severity !== IssueSeverity.Info);
  if (shown.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
      {shown.map((issue, index) => (
        <li
          key={`${issue.code}-${index}`}
          className={cn(
            "flex items-start gap-1.5",
            issue.severity === IssueSeverity.Error
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">
              {issue.code}
              {" · "}
              {issue.line === undefined
                ? issue.file
                : `${issue.file}:${issue.line}`}
            </span>
            <span>{issue.message}</span>
            {issue.hint && <span className="opacity-80">{issue.hint}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
