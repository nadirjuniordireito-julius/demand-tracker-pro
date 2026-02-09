import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface LabeledCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Título exibido como Label na linha superior do card, alinhado à esquerda */
  title: React.ReactNode;
  /** Conteúdo do card (abaixo do título) */
  children: React.ReactNode;
  /** Classes adicionais para o Card */
  cardClassName?: string;
  /** Classes adicionais para a área do título */
  titleClassName?: string;
  /** Classes adicionais para o conteúdo */
  contentClassName?: string;
}

/**
 * Card padrão do sistema com um título (Label) sobre a linha superior do card,
 * alinhado à esquerda. O label fica inteiro dentro do card sobre uma linha (border),
 * sem ser cortado por overflow.
 */
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
      {/* Linha no topo; o label sobrepõe a linha e fica à frente (z-10); header com fundo #f3f3f3 */}
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
