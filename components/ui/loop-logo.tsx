import React from 'react';
import { ColorSchemeName, StyleSheet, Text, View } from 'react-native';

import { fonts, getTheme } from '@/components/ui/theme';

type LoopLogoSize = 'sm' | 'md' | 'lg';

type LoopLogoProps = {
  colorScheme: ColorSchemeName;
  size?: LoopLogoSize;
  showSubtitle?: boolean;
};

const dimensions = {
  sm: { mark: 24, ring: 11, text: 20, subtitle: 9 },
  md: { mark: 30, ring: 13, text: 26, subtitle: 10 },
  lg: { mark: 40, ring: 17, text: 38, subtitle: 11 },
};

export function LoopLogo({ colorScheme, size = 'md', showSubtitle = false }: LoopLogoProps) {
  const theme = getTheme(colorScheme);
  const scale = dimensions[size];

  return (
    <View>
      <View style={styles.row}>
        <View style={[styles.mark, { width: scale.mark, height: scale.mark, borderColor: theme.borderStrong }]}>
          <View
            style={[
              styles.ring,
              {
                width: scale.ring,
                height: scale.ring,
                borderColor: theme.text,
                left: scale.mark * 0.16,
                transform: [{ translateY: -(scale.ring / 2) }],
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              {
                width: scale.ring,
                height: scale.ring,
                borderColor: theme.accentDeep,
                right: scale.mark * 0.16,
                transform: [{ translateY: -(scale.ring / 2) }],
              },
            ]}
          />
        </View>

        <Text
          style={[
            styles.wordmark,
            {
              fontSize: scale.text,
              lineHeight: Math.round(scale.text * 1.05),
              color: theme.text,
              fontFamily: fonts.display,
            },
          ]}>
          l<Text style={{ color: theme.accentDeep }}>oo</Text>p
        </Text>
      </View>

      {showSubtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSoft, fontFamily: fonts.mono, fontSize: scale.subtitle }]}>
          building circular economy
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  mark: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    borderRadius: 999,
    borderWidth: 1.5,
    position: 'absolute',
    top: '50%',
  },
  wordmark: {
    letterSpacing: -0.8,
  },
  subtitle: {
    letterSpacing: 1.4,
    marginTop: 4,
    textTransform: 'uppercase',
  },
});
