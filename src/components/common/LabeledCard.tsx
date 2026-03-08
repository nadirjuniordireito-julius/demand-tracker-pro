import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface LabeledCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  children: React.ReactNode;
  cardClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
}

export function LabeledCard({
  title,
  children,
  cardClassName,
  titleClassName,
  contentClassName,
  className,
  ...props
}: LabeledCardProps) {
  return (
    <Card className={cn('relative', cardClassName, className)} {...props}>
      <div
        className={cn(
          'relative border-b border-border min-h-[2rem] flex items-center px-3 -mb-px bg-[#f3f3f3]',
          titleClassName
        )}
      >
        <Label className="text-left font-medium cursor-default bg-[#f3f3f3] text-[#333] px-2 relative z-10 -mb-px">
          {title}
        </Label>
      </div>

      <CardContent className={cn('p-4 pt-3', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}