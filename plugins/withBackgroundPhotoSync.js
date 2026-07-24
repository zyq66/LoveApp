const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = function withBackgroundPhotoSync(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_REMOTE_MESSAGING',
    'android.permission.POST_NOTIFICATIONS',
  ]);

  return withAndroidManifest(config, configWithManifest => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(configWithManifest.modResults);
    application.service = application.service || [];
    const serviceName = 'com.asterinet.react.bgactions.RNBackgroundActionsTask';
    let service = application.service.find(item => item.$?.['android:name'] === serviceName);
    if (!service) {
      service = { $: { 'android:name': serviceName } };
      application.service.push(service);
    }
    service.$['android:foregroundServiceType'] = 'remoteMessaging';
    service.$['android:exported'] = 'false';
    return configWithManifest;
  });
};
