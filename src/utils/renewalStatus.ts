import { ClientSubscription } from '../types';

export function needsRenewalAttention(subscription: ClientSubscription): boolean {
  return subscription.status !== 'Cancelled' && (subscription.days_remaining != null
    ? subscription.days_remaining <= 15
    : ['Expired', 'Expiring Soon'].includes(subscription.status));
}
