import React, { useState } from "react";
import { ActivityIndicator, Linking, SafeAreaView, StatusBar, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";

const configuredUrl = process.env.EXPO_PUBLIC_PARENT_PORTAL_URL;
let portal;
try {
  const parsed = new URL(configuredUrl);
  if (parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash) portal = parsed;
} catch {
  // An invalid or missing configuration must not load a potentially unsafe site.
}

export default function App() {
  const [error, setError] = useState("");
  if (!portal) return <SafeAreaView style={styles.center}><Text style={styles.title}>Family portal unavailable</Text><Text>Set EXPO_PUBLIC_PARENT_PORTAL_URL to the HTTPS origin of the school website before building this app.</Text></SafeAreaView>;
  const origin = portal.origin;
  return <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" />
    {error ? <View style={styles.center}><Text style={styles.title}>Unable to open the family portal</Text><Text>{error}</Text></View> : <WebView
      source={{ uri: `${origin}/parent` }}
      originWhitelist={["https://*"]}
      onShouldStartLoadWithRequest={(request) => {
        try {
          const target = new URL(request.url);
          if (target.origin === origin) return true;
          if (target.protocol === "https:") void Linking.openURL(target.href).catch(() => setError("The external link could not be opened."));
        } catch { setError("The requested link was invalid."); }
        return false;
      }}
      onError={() => setError("Check your connection and try opening the app again.")}
      onHttpError={(event) => { if (event.nativeEvent.statusCode >= 500) setError("The school website is temporarily unavailable."); }}
      startInLoadingState
      renderLoading={() => <ActivityIndicator style={styles.loading} />}
      allowFileAccess={false}
      mixedContentMode="never"
      setSupportMultipleWindows={false}
      sharedCookiesEnabled
    />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, padding: 28, justifyContent: "center", gap: 12, backgroundColor: "#fff" },
  title: { fontWeight: "700", fontSize: 20, color: "#182b44" },
  loading: { position: "absolute", top: "50%", alignSelf: "center" },
});
