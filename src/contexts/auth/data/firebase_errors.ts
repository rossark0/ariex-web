/**
 * Firebase authentication error translations
 * Maps Firebase error codes to user-friendly messages
 */
export const FIREBASE_AUTH_ERRORS: Record<string, { title: string; description: string }> = {
  'auth/email-already-in-use': {
    title: 'Email já cadastrado',
    description: 'Este email já está em uso. Tente fazer login ou use outro email.',
  },
  'auth/invalid-email': {
    title: 'Email inválido',
    description: 'Por favor, insira um endereço de email válido.',
  },
  'auth/operation-not-allowed': {
    title: 'Operação não permitida',
    description: 'Esta operação não está habilitada. Entre em contato com o suporte.',
  },
  'auth/weak-password': {
    title: 'Senha fraca',
    description: 'A senha deve ter pelo menos 6 caracteres.',
  },
  'auth/user-disabled': {
    title: 'Usuário desabilitado',
    description: 'Esta conta foi desabilitada. Entre em contato com o suporte.',
  },
  'auth/user-not-found': {
    title: 'Usuário não encontrado',
    description: 'Não existe uma conta com este email.',
  },
  'auth/wrong-password': {
    title: 'Senha incorreta',
    description: 'A senha está incorreta. Tente novamente.',
  },
  'auth/too-many-requests': {
    title: 'Muitas tentativas',
    description: 'Você fez muitas tentativas. Aguarde alguns minutos e tente novamente.',
  },
  'auth/network-request-failed': {
    title: 'Erro de conexão',
    description: 'Verifique sua conexão com a internet e tente novamente.',
  },
  'auth/invalid-credential': {
    title: 'Credenciais inválidas',
    description: 'Email ou senha incorretos.',
  },
  'auth/account-exists-with-different-credential': {
    title: 'Conta já existe',
    description: 'Já existe uma conta com este email usando outro método de login.',
  },
  'auth/invalid-verification-code': {
    title: 'Código inválido',
    description: 'O código de verificação está incorreto.',
  },
  'auth/invalid-verification-id': {
    title: 'Verificação inválida',
    description: 'A sessão de verificação expirou. Tente novamente.',
  },
  'auth/expired-action-code': {
    title: 'Código expirado',
    description: 'Este link de verificação expirou. Solicite um novo.',
  },
  'auth/invalid-action-code': {
    title: 'Código inválido',
    description: 'Este link de verificação é inválido ou já foi usado.',
  },
  'auth/popup-closed-by-user': {
    title: 'Login cancelado',
    description: 'O popup de login foi fechado. Tente novamente.',
  },
  'auth/cancelled-popup-request': {
    title: 'Login cancelado',
    description: 'A solicitação de login foi cancelada.',
  },
};
