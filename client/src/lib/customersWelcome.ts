export const CUSTOMERS_WELCOME_VERSION = "v1";

export function customersWelcomeStorageKey(providerId: number) {
  return `ologycrew:customers-welcome:${CUSTOMERS_WELCOME_VERSION}:provider:${providerId}`;
}
