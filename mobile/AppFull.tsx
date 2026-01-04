/**
 * App completo - Versão original com todas as funcionalidades de jogo
 */

import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './context/GameContext';
import { LoginScreen } from './screens/LoginScreen';
import { BluetoothConnectionScreen } from './screens/BluetoothConnectionScreen';
import { TeamsMainScreen } from './screens/TeamsMainScreen';
import { CreateTeamScreen } from './screens/CreateTeamScreen';
import { BrowseTeamsScreen } from './screens/BrowseTeamsScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { QuizScreen } from './screens/QuizScreen';
import { ResultScreen } from './screens/ResultScreen';
import { PlayAgainScreen } from './screens/PlayAgainScreen';

export type RootStackParamList = {
  Login: undefined;
  BluetoothConnection: undefined;
  TeamsMain: undefined;
  CreateTeam: undefined;
  BrowseTeams: undefined;
  Lobby: undefined;
  Quiz: undefined;
  Result: { result?: 'success' | 'fail' };
  PlayAgain: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
type BluetoothScreenProps = NativeStackScreenProps<RootStackParamList, 'BluetoothConnection'>;
type TeamsMainScreenProps = NativeStackScreenProps<RootStackParamList, 'TeamsMain'>;
type CreateTeamScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateTeam'>;
type BrowseTeamsScreenProps = NativeStackScreenProps<RootStackParamList, 'BrowseTeams'>;
type LobbyScreenProps = NativeStackScreenProps<RootStackParamList, 'Lobby'>;
type QuizScreenProps = NativeStackScreenProps<RootStackParamList, 'Quiz'>;
type ResultScreenProps = NativeStackScreenProps<RootStackParamList, 'Result'>;
type PlayAgainScreenProps = NativeStackScreenProps<RootStackParamList, 'PlayAgain'>;

export default function AppFull() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isBluetoothConnected, setIsBluetoothConnected] = useState(false);

  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0b1320' },
            }}
            initialRouteName="Login"
          >
            <Stack.Screen name="Login">
              {(props: LoginScreenProps) => (
                <LoginScreen
                  {...props}
                  onLoginSuccess={() => {
                    setIsAuthenticated(true);
                    props.navigation.navigate('BluetoothConnection');
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
                    props.navigation.navigate('TeamsMain');
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




