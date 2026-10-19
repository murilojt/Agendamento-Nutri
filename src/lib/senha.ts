// Senha provisória legível (sem 0/O, 1/l/I) para a nutricionista repassar ao paciente.
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function gerarSenhaProvisoria(tamanho = 10, aleatorio: (n: number) => number[] = sorteio): string {
  const limite = 256 - (256 % ALFABETO.length); // descarta valores que enviesariam a escolha
  let senha = "";
  while (senha.length < tamanho) {
    for (const v of aleatorio(tamanho * 2)) {
      if (v < limite && senha.length < tamanho) senha += ALFABETO[v % ALFABETO.length];
    }
  }
  return senha;
}

function sorteio(n: number): number[] {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)));
}

export const MIN_SENHA_PROVISORIA = 6;
export const MIN_SENHA_NOVA = 8;

/** Erro de validação da senha nova escolhida pelo paciente, ou null se estiver ok. */
export function validarSenhaNova(senha: string, repetida: string, provisoria?: string): string | null {
  if (senha.length < MIN_SENHA_NOVA) return `A senha precisa ter pelo menos ${MIN_SENHA_NOVA} caracteres.`;
  if (senha !== repetida) return "As senhas não coincidem.";
  if (provisoria && senha === provisoria) return "Escolha uma senha diferente da provisória.";
  return null;
}
