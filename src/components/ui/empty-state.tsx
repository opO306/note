import React from "react";
import { Card, CardContent } from "./card";

interface EmptyStatePanelProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  glowClassName?: string;
  circleClassName?: string;
  containerClassName?: string;
}

export function EmptyStatePanel({
  icon,
  title,
  description,
  action,
  glowClassName,
  circleClassName,
  containerClassName,
}: EmptyStatePanelProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-96 text-center px-4 ${containerClassName ?? ""}`}>
      <div className="relative mb-8">
        <div
          className={`absolute inset-0 ${glowClassName ?? "bg-amber-500/30 dark:bg-amber-400/30"
            } blur-3xl rounded-full animate-pulse`}
        />
        <div
          className={`relative w-32 h-32 rounded-full ${circleClassName ?? "bg-amber-100 dark:bg-amber-900/40 border-4 border-amber-400 dark:border-amber-600"
            } flex items-center justify-center shadow-lg`}
        >
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-64">{description}</p>
      {action}
    </div>
  );
}

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  glowClassName?: string;
  circleClassName?: string;
}

export function EmptyStateCard({
  icon,
  title,
  description,
  glowClassName,
  circleClassName,
}: EmptyStateCardProps) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <div className="relative mb-6">
          <div
            className={`absolute inset-0 ${glowClassName ?? "bg-amber-500/30 dark:bg-amber-400/30"
              } blur-2xl rounded-full`}
          />
          <div
            className={`relative w-24 h-24 rounded-full ${circleClassName ?? "bg-amber-100 dark:bg-amber-900/40 border-4 border-amber-400 dark:border-amber-600"
              } shadow-lg flex items-center justify-center mx-auto`}
          >
            {icon}
          </div>
        </div>
        <h3 className="font-medium text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

