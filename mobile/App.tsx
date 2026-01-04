import React, { useState, useEffect } from 'react';
// @ts-ignore - Will be available after npm install
import { NavigationContainer } from '@react-navigation/native';
// @ts-ignore - Will be available after npm install
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
// @ts-ignore - Will be available after npm install
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './context/GameContext';
import { BluetoothPermissionScreen } from './screens/BluetoothPermissionScreen';
import { BluetoothBlockedScreen } from './screens/BluetoothBlockedScreen';
import { LoginScreen } from './screens/LoginScreen';
import { QRCodeScannerScreen } from './screens/QRCodeScannerScreen';
import { CabinLobbyScreen } from './screens/CabinLobbyScreen';
import { BluetoothConnectionScreen } from './screens/BluetoothConnectionScreen';
import { BluetoothConnectionErrorScreen } from './screens/BluetoothConnectionErrorScreen';
import { TeamsMainScreen } from './screens/TeamsMainScreen';
import { CreateTeamScreen } from './screens/CreateTeamScreen';
import { BrowseTeamsScreen } from './screens/BrowseTeamsScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultScreen } from './screens/ResultScreen';
import { PlayAgainScreen } from './screens/PlayAgainScreen';
import { PERMISSIONS, checkMultiple, RESULTS, Permission } from 'react-native-permissions';
import { Platform, View, Text } from 'react-native';

export type RootStackParamList = {
  BluetoothPermission: undefined;
  BluetoothBlocked: undefined;
  QRCodeScanner: undefined;
  Login: undefined;
  CabinLobby: undefined;
  BluetoothConnection: undefined;
  BluetoothConnectionError: { error: string; bluetoothDeviceName?: string };
  TeamsMain: undefined;
  CreateTeam: undefined;
  BrowseTeams: undefined;
  Lobby: undefined;
  Quiz: undefined;
  Result: { result?: 'success' | 'fail' };
  PlayAgain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type BluetoothPermissionScreenProps = NativeStackScreenProps<RootStackParamList, 'BluetoothPermission'>;
type BluetoothBlockedScreenProps = NativeStackScreenProps<RootStackParamList, 'BluetoothBlocked'>;
type QRCodeScannerScreenProps = NativeStackScreenProps<RootStackParamList, 'QRCodeScanner'>;
type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
type CabinLobbyScreenProps = NativeStackScreenProps<RootStackParamList, 'CabinLobby'>;
type BluetoothScreenProps = NativeStackScreenProps<RootStackParamList, 'BluetoothConnection'>;
type BluetoothErrorScreenProps = NativeStackScreenProps<RootStackParamList, 'BluetoothConnectionError'>;
type TeamsMainScreenProps = NativeStackScreenProps<RootStackParamList, 'TeamsMain'>;
type CreateTeamScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;
type BrowseTeamsScreenProps = NativeStackScreenProps<RootStackParamList, 'BrowseTeams'>;
type LobbyScreenProps = NativeStackScreenProps<RootStackParamList, 'Lobby'>;
type QuizScreenProps = NativeStackScreenProps<RootStackParamList, 'Quiz'>;
type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
type PlayAgainScreenProps = NativeStackScreenProps<RootStackParamList, 'PlayAgain'>;

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);
  const [hasBluetoothPermission, setHasBluetoothPermission] = useState<boolean | null>(null);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('BluetoothPermission');

  useEffect(() => {
    checkBluetoothPermissions();
  }, []);

  const checkBluetoothPermissions = async () => {
    try {
      let permissions: Permission[] = [];
      
      if (Platform.OS === 'android') {
        permissions = [
          PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
          PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        ];
      } else {
        // iOS: No iOS 13+, não há permissão explícita de Bluetooth
        // A permissão de Localização é necessária para escanear dispositivos Bluetooth
        permissions = [
          PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        ];
      }

      console.log('[App] Verificando permissões:', permissions);
      const results = await checkMultiple(permissions);
      console.log('[App] Resultados:', results);
      
      const allGranted = Object.values(results).every(
        (result) => result === RESULTS.GRANTED || result === RESULTS.LIMITED
      );

      console.log('[App] Todas as permissões concedidas?', allGranted);
      setHasBluetoothPermission(allGranted);
      setInitialRoute(allGranted ? 'QRCodeScanner' : 'BluetoothPermission');
      setIsCheckingPermissions(false);
    } catch (error) {
      console.error('[App] Erro ao verificar permissões', error);
      setHasBluetoothPermission(false);
      setInitialRoute('BluetoothPermission');
      setIsCheckingPermissions(false);
    }
  };

  // Mostra loading enquanto verifica permissões
  if (isCheckingPermissions) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#0b1320', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Carregando...</Text>
        </View>
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0b1320' },
            }}
            initialRouteName={initialRoute}
          >
            <Stack.Screen name="BluetoothPermission">
              {(props: BluetoothPermissionScreenProps) => (
                <BluetoothPermissionScreen
                  onPermissionGranted={() => {
                    setHasBluetoothPermission(true);
                    props.navigation.replace('QRCodeScanner');
                  }}
                  onPermissionDenied={() => {
                    props.navigation.replace('BluetoothBlocked');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="BluetoothBlocked">
              {(props: BluetoothBlockedScreenProps) => (
                <BluetoothBlockedScreen
                  onPermissionGranted={() => {
                    setHasBluetoothPermission(true);
                    props.navigation.replace('QRCodeScanner');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="QRCodeScanner">
              {(props: QRCodeScannerScreenProps) => (
                <QRCodeScannerScreen
                  onQRCodeScanned={(data) => {
                    console.log('[App] QR Code escaneado:', data);
                    props.navigation.navigate('Login');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Login">
              {(props: LoginScreenProps) => (
                <LoginScreen
                  {...props}
                  onLoginSuccess={() => {
                    setIsAuthenticated(true);
                    props.navigation.navigate('CabinLobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="CabinLobby">
              {(props: CabinLobbyScreenProps) => (
                <CabinLobbyScreen
                  onRoleAssigned={(role, data) => {
                    console.log('[App] Role atribuído:', role);
                    if (role === 'leader') {
                      props.navigation.navigate('TeamsMain');
                    } else {
                      // Participante vai direto para Lobby
                      props.navigation.navigate('Lobby');
                    }
                  }}
                  onError={(error) => {
                    console.error('[App] Erro no CabinLobby:', error);
                    // Voltar para QR Scanner em caso de erro
                    props.navigation.navigate('QRCodeScanner');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="BluetoothConnection">
              {(props: BluetoothScreenProps) => (
                <BluetoothConnectionScreen
                  {...props}
                  onConnected={() => {
                    setIsBluetoothConnected(true);
                    props.navigation.navigate('TeamsMain');
                  }}
                  onSkip={() => {
                    setIsBluetoothConnected(true);
                    props.navigation.navigate('TeamsMain');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="BluetoothConnectionError">
              {(props: BluetoothErrorScreenProps) => (
                <BluetoothConnectionErrorScreen
                  error={props.route.params?.error || 'Erro desconhecido'}
                  bluetoothDeviceName={props.route.params?.bluetoothDeviceName}
                  onTryAgain={() => {
                    props.navigation.navigate('QRCodeScanner');
                  }}
                  onUseMockMode={() => {
                    // Ativar modo mock no BluetoothService e ir direto para o jogo
                    const { bluetoothService } = require('../services/BluetoothService');
                    bluetoothService.enableMockMode();
                    props.navigation.navigate('Quiz');
                  }}
                  onBackToLobby={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="TeamsMain">
              {(props: TeamsMainScreenProps) => (
                <TeamsMainScreen
                  {...props}
                  onCreateTeam={() => {
                    props.navigation.navigate('CreateTeam');
                  }}
                  onBrowseTeams={() => {
                    props.navigation.navigate('BrowseTeams');
                  }}
                  onAlreadyInTeam={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="CreateTeam">
              {(props: CreateTeamScreenProps) => (
                <CreateTeamScreen
                  {...props}
                  onJoinTeam={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="BrowseTeams">
              {(props: BrowseTeamsScreenProps) => (
                <BrowseTeamsScreen
                  {...props}
                  onJoinTeam={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Lobby">
              {(props: LobbyScreenProps) => (
                <LobbyScreen
                  {...props}
                  onStartGame={() => {
                    props.navigation.navigate('Quiz');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Quiz">
              {(props: QuizScreenProps) => (
                <QuizScreen
                  {...props}
                  onFinish={(result) => {
                    props.navigation.navigate('Result', { result });
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="Result">
              {(props: ResultScreenProps) => (
                <ResultScreen
                  {...props}
                  onPlayAgain={() => {
                    props.navigation.navigate('PlayAgain');
                  }}
                  onBackToLobby={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen name="PlayAgain">
              {(props: PlayAgainScreenProps) => (
                <PlayAgainScreen
                  {...props}
                  onPlayAgain={() => {
                    // Voltar ao lobby para iniciar nova partida com mesmo time/cabine
                    props.navigation.navigate('Lobby');
                  }}
                  onBackToLobby={() => {
                    props.navigation.navigate('Lobby');
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style="light" />
      </GameProvider>
    </SafeAreaProvider>
  );
}
