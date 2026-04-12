import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';

export default function App() {
  // Replace this with your actual hosted URL once deployed
  const APP_URL = 'https://ais-dev-v7ogtvzuc33sr2m3jydxdd-538663974620.europe-west2.run.app';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.webviewContainer}>
        <WebView 
          source={{ uri: APP_URL }} 
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});
