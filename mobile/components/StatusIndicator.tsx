/**
 * Componente de indicador de status
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface StatusIndicatorProps {
  status: 'scanning' | 'connecting' | 'connected' | 'disconnected' | 'error';
  message?: string;
  animated?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  message,
  animated = false,
}) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (animated && (status === 'scanning' || status === 'connecting')) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [status, animated, pulseAnim]);

  const getStatusConfig = () => {
    switch (status) {
      case 'scanning':
        return { icon: '📡', color: '#3b82f6', label: 'Procurando...' };
      case 'connecting':
        return { icon: '🔗', color: '#f59e0b', label: 'Conectando...' };
      case 'connected':
        return { icon: '✓', color: '#10b981', label: 'Conectado' };
      case 'disconnected':
        return { icon: '✗', color: '#6b7280', label: 'Desconectado' };
      case 'error':
        return { icon: '⚠', color: '#ef4444', label: 'Erro' };
      default:
        return { icon: '○', color: '#9ca3af', label: 'Desconhecido' };
    }
  };

  const config = getStatusConfig();
  const containerStyle = animated && (status === 'scanning' || status === 'connecting')
    ? { transform: [{ scale: pulseAnim }] }
    : {};

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { borderColor: config.color }, containerStyle]}>
        <Text style={styles.icon}>{config.icon}</Text>
      </Animated.View>
      <Text style={[styles.label, { color: config.color }]}>{message || config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 12,
  },
  icon: {
    fontSize: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});




