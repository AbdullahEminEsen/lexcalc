import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useSubscription } from '../context/SubscriptionContext';

const AD_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-5947294446989987/9233466801';

export function AdBanner() {
  const { isPremium, isTrialActive } = useSubscription();

  // Premium kullanıcılara reklam gösterme
  if (isPremium || isTrialActive) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
