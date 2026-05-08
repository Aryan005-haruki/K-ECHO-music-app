import { View, Text, StatusBar, LogBox } from 'react-native';
import { useEffect, useCallback } from 'react';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();
import { Ionicons } from '@expo/vector-icons';

// LogBox.ignoreAllLogs();
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PlayerProvider, usePlayer } from './src/context/PlayerContext';
import NowPlayingBar from './src/components/NowPlayingBar';
import FullScreenPlayer from './src/components/FullScreenPlayer';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import ReelsScreen from './src/screens/ReelsScreen';
import PlaylistDetailScreen from './src/screens/PlaylistDetailScreen';
import GenreDetailScreen from './src/screens/GenreDetailScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="SearchMain" component={SearchScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="GenreDetail" component={GenreDetailScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="GenreDetail" component={GenreDetailScreen} />
    </Stack.Navigator>
  );
}

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
      <Stack.Screen name="Reels" component={ReelsScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
      <Stack.Screen name="GenreDetail" component={GenreDetailScreen} />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LibraryMain" component={LibraryScreen} />
      <Stack.Screen name="PlaylistDetail" component={PlaylistDetailScreen} />
    </Stack.Navigator>
  );
}

function MainLayout() {
  const { isFullPlayerVisible, setIsFullPlayerVisible } = usePlayer();
  
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Tab.Navigator
        screenOptions={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? '';
          const hideTabs = routeName === 'Reels' || isFullPlayerVisible;
          
          return {
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#0a0a0f',
              borderTopWidth: 0,
              height: 60,
              paddingBottom: 8,
              display: hideTabs ? 'none' : 'flex',
            },
            tabBarActiveTintColor: '#1DB954',
            tabBarInactiveTintColor: '#666',
          };
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeStack}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Explore" 
          component={ExploreStack}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchStack}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="search" size={size} color={color} />,
          }}
        />
        <Tab.Screen 
          name="Library" 
          component={LibraryStack}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
      <NowPlayingBar />
      <FullScreenPlayer visible={isFullPlayerVisible} onClose={() => setIsFullPlayerVisible(false)} />
    </View>
  );
}

function RootNavigator() {
  const { recentlyPlayed, onboardingData, isDataLoaded } = usePlayer();
  
  useEffect(() => {
    async function hideSplash() {
      if (isDataLoaded) {
        await SplashScreen.hideAsync();
      }
    }
    hideSplash();
  }, [isDataLoaded]);

  if (!isDataLoaded) return null; // Wait for storage load

  const showOnboarding = !onboardingData.completed;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {showOnboarding ? (
        <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : null}
      <RootStack.Screen name="MainTabs" component={MainLayout} />
    </RootStack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PlayerProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </PlayerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

