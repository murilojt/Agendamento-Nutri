// Esqueleto HTML compartilhado pelos dois "layouts raiz" (site público e área de contas).

// Aplica o tema salvo antes da primeira pintura, para a página não piscar.
const SCRIPT_TEMA = `try{var t=localStorage.getItem("tema");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export function PaginaRaiz({ children, classeBody }: { children: React.ReactNode; classeBody?: string }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className={classeBody}>{children}</body>
    </html>
  );
}
