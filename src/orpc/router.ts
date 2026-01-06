import * as todosProcedures from './procedures/todos.procedures';
import * as adminProcedures from './procedures/admin.procedures';
import * as clientProcedures from './procedures/client.procedures';
import * as documentsProcedures from './procedures/documents.procedures';
import * as chatProcedures from './procedures/chat.procedures';
import * as strategiesProcedures from './procedures/strategies.procedures';
import * as paymentsProcedures from './procedures/payments.procedures';
import * as subscriptionsProcedures from './procedures/subscriptions.procedures';

/**
 * Main application router
 * Combines all procedures into a single router object
 */
export const router = {
  todos: {
    list: todosProcedures.listTodos,
    get: todosProcedures.getTodo,
    create: todosProcedures.createTodo,
    update: todosProcedures.updateTodo,
    delete: todosProcedures.deleteTodo,
    toggle: todosProcedures.toggleTodo,
  },
  admin: {
    listClients: adminProcedures.listClients,
    inviteClient: adminProcedures.inviteClient,
    getStats: adminProcedures.getAdminStats,
  },
  client: {
    getProfile: clientProcedures.getProfile,
    updateProfile: clientProcedures.updateProfile,
    completeOnboarding: clientProcedures.completeOnboarding,
  },
  // Backwards-compatible `users` namespace used by examples
  users: {
    getCurrent: clientProcedures.getProfile,
    updateCurrent: clientProcedures.updateProfile,
  },
  documents: {
    list: documentsProcedures.listDocuments,
    get: documentsProcedures.getDocument,
    upload: documentsProcedures.uploadDocument,
    createUploadUrl: documentsProcedures.createUploadUrl,
    finalizeUpload: documentsProcedures.finalizeUpload,
    delete: documentsProcedures.deleteDocument,
    requestSignature: documentsProcedures.requestSignature,
  },
  chat: {
    list: chatProcedures.listMessages,
    send: chatProcedures.sendMessage,
    clear: chatProcedures.clearConversation,
  },
  strategies: {
    list: strategiesProcedures.listStrategies,
    generate: strategiesProcedures.generateStrategies,
    update: strategiesProcedures.updateStrategy,
  },
  payments: {
    list: paymentsProcedures.listPayments,
    create: paymentsProcedures.createPayment,
    updateStatus: paymentsProcedures.updatePaymentStatus,
  },
  subscriptions: {
    getCurrent: subscriptionsProcedures.getCurrentSubscription,
    get: subscriptionsProcedures.getSubscription,
    create: subscriptionsProcedures.createSubscription,
    update: subscriptionsProcedures.updateSubscription,
    cancel: subscriptionsProcedures.cancelSubscription,
  },
};

export type AppRouter = typeof router;
