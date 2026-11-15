export function shouldPersistRewardRequestToCloud(isGuest: boolean, supabaseConfigured: boolean): boolean {
  return !isGuest && supabaseConfigured;
}

export function shouldLoadCloudRewardPurchases(
  isGuest: boolean,
  isRewardStoreOpen: boolean,
  supabaseConfigured: boolean
): boolean {
  return shouldPersistRewardRequestToCloud(isGuest, supabaseConfigured) && isRewardStoreOpen;
}
