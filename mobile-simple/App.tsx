import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { BluetoothConnectionScreen } from './screens/BluetoothConnectionScreen';
import { ControlScreen } from './screens/ControlScreen';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);

  return (
    <View style={styles.container}>
      {!isConnected ? (
        <BluetoothConnectionScreen onConnected={() => setIsConnected(true)} />
      ) : (
        <ControlScreen onBack={() => setIsConnected(false)} />
      )}
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
  },
});

