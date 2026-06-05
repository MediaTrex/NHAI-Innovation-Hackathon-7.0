const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Reduce NativeWind/Metro watcher crashes during rapid file saves
config.server = {
  ...config.server,
  unstable_serverRoot: __dirname,
  host: '0.0.0.0',
};

module.exports = withNativeWind(config, {
  input: './src/global.css',
  disableTypeScriptGeneration: true,
});
