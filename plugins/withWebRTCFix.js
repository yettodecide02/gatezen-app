const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * Replaces the JitPack-hosted org.jitsi:webrtc dependency with the identical
 * Google WebRTC build published on Maven Central (io.github.webrtc-sdk:android).
 *
 * WHY: JitPack's org.jitsi:webrtc maven-metadata.xml endpoint consistently
 * times out during EAS builds. Both artifacts compile the same Google WebRTC
 * source and export the same org.webrtc.* Java package API — the swap is safe.
 *
 * The resolution rule fires for every Gradle configuration (including transitive
 * deps like :react-native-webrtc → api 'org.jitsi:webrtc:124.+') and redirects
 * to a pinned Maven Central artifact, bypassing JitPack entirely.
 */
const withWebRTCFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("io.github.webrtc-sdk:android")) {
      config.modResults.contents += `
// Remap org.jitsi:webrtc -> io.github.webrtc-sdk:android (Maven Central).
// JitPack's org.jitsi:webrtc endpoint times out in EAS builds; this artifact
// is the identical Google WebRTC build hosted reliably on Maven Central.
allprojects {
  configurations.all {
    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'org.jitsi' && details.requested.name == 'webrtc') {
        details.useTarget('io.github.webrtc-sdk:android:125.6422.07')
        details.because('JitPack org.jitsi:webrtc times out; use Maven Central mirror')
      }
    }
  }
}
`;
    }
    return config;
  });
};

module.exports = withWebRTCFix;
