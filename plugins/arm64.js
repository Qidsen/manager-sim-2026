// Сборка только под 64-битный ARM (arm64-v8a): меньше размер APK.
const { withGradleProperties } = require('expo/config-plugins');

module.exports = function withArm64Only(config) {
  return withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter((i) => !(i.type === 'property' && i.key === 'reactNativeArchitectures'));
    c.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    return c;
  });
};
