const path = require('node:path');

module.exports = {
  packagerConfig: {
    name: 'InkBlot',
    appBundleId: 'com.eregionlabs.inkblot',
    appVersion: '1.0.0',
    buildVersion: '1',
    icon: path.join(__dirname, 'build', 'icon'),
    asar: true,
    appCategoryType: 'public.app-category.productivity',

    extendInfo: {
      ElectronTeamID: 'REPLACE_WITH_YOUR_TEAM_ID',
      CFBundleIconName: 'AppIcon',
    },

    // Uncomment and fill in when ready to sign for MAS:
    // osxSign: {
    //   identity: 'Apple Distribution: Your Name (TEAM_ID)',
    //   platform: 'mas',
    //   provisioningProfile: path.join(__dirname, 'build', 'MacAppStore_Distribution.provisionprofile'),
    //   optionsForFile: (filePath) => {
    //     if (filePath.includes('.app/')) {
    //       return {
    //         hardenedRuntime: false,
    //         entitlements: path.join(__dirname, 'build', 'entitlements.mas.inherit.plist'),
    //       };
    //     }
    //     return {
    //       hardenedRuntime: false,
    //       entitlements: path.join(__dirname, 'build', 'entitlements.mas.plist'),
    //     };
    //   },
    // },
  },

  makers: [
    {
      name: '@electron-forge/maker-pkg',
      platforms: ['mas'],
      config: {
        // identity: '3rd Party Mac Developer Installer: Your Name (TEAM_ID)',
      },
    },
    {
      name: '@electron-forge/maker-dmg',
      platforms: ['darwin'],
      config: {
        format: 'ULFO',
      },
    },
  ],
};
