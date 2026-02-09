/**
 * BubblePrototypeVisual — Protótipo estático para validar linguagem visual
 *
 * 5 bolhas posicionadas manualmente, cada uma demonstrando um aspecto:
 * - Tamanho (valor financeiro)
 * - Cor (prazo: verde/amarelo/vermelho)
 * - Halo (desvio esforço/custo)
 * - Pulsação (tendência de risco)
 *
 * Sem D3, sem zoom, sem integração com dados.
 */

export function BubblePrototypeVisual() {
  return (
    <div className="relative h-full w-full min-h-[400px] flex items-center justify-center bg-muted/30 rounded-lg">
      <style>{`
        @keyframes bubble-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.9; }
        }
        .bubble-pulse { animation: bubble-pulse 1.5s ease-in-out infinite; }
      `}</style>
      <svg
        viewBox="0 0 500 400"
        className="h-full w-full max-h-[500px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="bubble-fill-green">
            <stop offset="0%" stopColor="hsl(142, 71%, 55%)" />
            <stop offset="100%" stopColor="hsl(142, 71%, 35%)" />
          </radialGradient>
          <radialGradient id="bubble-fill-yellow">
            <stop offset="0%" stopColor="hsl(38, 92%, 60%)" />
            <stop offset="100%" stopColor="hsl(38, 92%, 40%)" />
          </radialGradient>
          <radialGradient id="bubble-fill-red">
            <stop offset="0%" stopColor="hsl(0, 72%, 58%)" />
            <stop offset="100%" stopColor="hsl(0, 72%, 42%)" />
          </radialGradient>
          <filter id="halo-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
            </feMerge>
          </filter>
        </defs>

        {/* Bolha 1: Grande | Verde | Sem halo | Sem pulsação */}
        <g transform="translate(100, 120)">
          <circle r="55" fill="url(#bubble-fill-green)" stroke="hsl(142, 71%, 40%)" strokeWidth="2" />
        </g>

        {/* Bolha 2: Média | Amarela | Halo leve */}
        <g transform="translate(280, 100)">
          <circle r="45" fill="hsl(38, 92%, 55%)" filter="url(#halo-glow)" opacity="0.5" />
          <circle r="35" fill="url(#bubble-fill-yellow)" stroke="hsl(38, 92%, 45%)" strokeWidth="2" />
        </g>

        {/* Bolha 3: Pequena | Vermelha | Halo forte */}
        <g transform="translate(400, 180)">
          <circle r="40" fill="hsl(0, 72%, 55%)" filter="url(#halo-glow)" opacity="0.6" />
          <circle r="25" fill="url(#bubble-fill-red)" stroke="hsl(0, 72%, 45%)" strokeWidth="2" />
        </g>

        {/* Bolha 4: Média | Verde | Halo médio | Pulsação */}
        <g transform="translate(150, 280)">
          <circle r="50" fill="hsl(142, 71%, 50%)" filter="url(#halo-glow)" opacity="0.4" />
          <g className="bubble-pulse">
            <circle r="40" fill="url(#bubble-fill-green)" stroke="hsl(142, 71%, 40%)" strokeWidth="2" />
          </g>
        </g>

        {/* Bolha 5: Muito pequena | Amarela | Sem halo | Pulsação forte */}
        <g transform="translate(320, 300)">
          <g className="bubble-pulse">
            <circle r="18" fill="url(#bubble-fill-yellow)" stroke="hsl(38, 92%, 45%)" strokeWidth="2" />
          </g>
        </g>
      </svg>

      {/* Legenda explicativa */}
      <div className="absolute bottom-4 left-4 right-4 rounded-md border bg-card/95 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-2">Legenda do protótipo</p>
        <ul className="space-y-1">
          <li><strong>Tamanho</strong> = valor financeiro (maior bolha = maior peso)</li>
          <li><strong>Cor</strong> = prazo (verde no prazo, amarelo atraso leve, vermelho crítico)</li>
          <li><strong>Halo</strong> = desvio esforço/custo (glow = desvio entre planejado e real)</li>
          <li><strong>Pulsação</strong> = tendência de risco (animação = risco em alta)</li>
        </ul>
      </div>
    </div>
  );
}
