export function HowItWorks() {
  return (
    <details>
      <summary>How the model works</summary>
      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        <p style={{ marginBottom: 10 }}>
          <strong>Disease pipeline.</strong> The world starts with about 17,000 known diseases and a pool of 25,000 more
          waiting to be discovered. Each disease moves through five stages: undiscovered, research, clinical trials,
          global rollout, and eradicated. AI-driven discoveries push diseases through these stages faster over time.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>Research allocation.</strong> Every year, human researchers and AI produce a pool of discoveries that
          are allocated across diseases in research. The model focuses primarily on the deadliest conditions, while balancing
          efforts across neglected diseases, platform technologies, and biological aging.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>Events and healthy years.</strong> Pandemics can divert research for years. Platform breakthroughs
          can unlock entire disease families at once. Safety scares pull therapies back into trials. Each year, the
          burden averted by rollout and eradicated diseases accumulates as healthy years gained and raises life expectancy.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>AI growth scenarios.</strong> Your choice at the start determines how AI capability evolves. In the
          exponential scenario it compounds continuously. With plateaus, progress periodically stalls for years at
          capability ceilings until a paradigm breakthrough restarts growth at a higher level.
        </p>
        <p style={{ marginBottom: 10 }}>
          <strong>Regulation and AI.</strong> Fast AI growth raises public alarm and tightens rules. Successful cures
          build trust and loosen them. Strict regulation slows AI growth and trial reform but prevents safety scares.
          Hands-off regulation does the opposite.
        </p>
        <p style={{ fontStyle: 'italic' }}>
          These figures are rough estimates for exploring how AI capability and biological complexity interact — not forecasts.
        </p>
      </div>
    </details>
  );
}
