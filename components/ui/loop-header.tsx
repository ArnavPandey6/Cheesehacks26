import React, { ReactNode } from 'react';
import { ColorSchemeName, StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { LoopLogo } from '@/components/ui/loop-logo';
import { fonts, getTheme } from '@/components/ui/theme';

type LoopHeaderProps = {
  colorScheme: ColorSchemeName;
  karma: number;
  rightIcon: ReactNode;
  subtitle?: string;
};

export function LoopHeader({ colorScheme, karma, rightIcon, subtitle = 'community relay' }: LoopHeaderProps) {
  const theme = getTheme(colorScheme);

  return (
    <View style={[styles.wrap, { borderBottomColor: theme.border }]}>
      <View>
        <LoopLogo colorScheme={colorScheme} size="sm" />
        <Text style={[styles.subtitle, { color: theme.textMuted, fontFamily: fonts.mono }]}>{subtitle}</Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.karmaChip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
          <Sparkles size={11} color={theme.accentDeep} />
          <Text style={[styles.karmaChipText, { color: theme.accentDeep, fontFamily: fonts.mono }]}>{karma} pts</Text>
        </View>
        <View style={[styles.iconBox, { backgroundColor: theme.surfaceStrong, borderColor: theme.border }]}>{rightIcon}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  subtitle: {
    fontSize: 10,
    letterSpacing: 1.1,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  right: {
    alignItems: 'flex-end',
    gap: 7,
  },
  karmaChip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  karmaChipText: {
    fontSize: 11,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: 11,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
});
