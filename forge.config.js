const path = require('node:path');

module.exports = {
  packagerConfig: {
    name: 'InkBlot',
    appBundleId: 'com.eregionlabs.inkwell',
    appVersion: '1.2.1',
    buildVersion: '8',
    icon: path.join(__dirname, 'build', 'icon'),
    asar: true,
    appCategoryType: 'public.app-category.productivity',
    extraResource: [
      path.join(__dirname, 'build', 'Assets.car'),
    ],

    extendInfo: {
      ElectronTeamID: '4U4L9UVK62',
      CFBundleIconName: 'AppIcon',
      LSMinimumSystemVersion: '12.0.0',
      CFBundleDocumentTypes: [
        {
          CFBundleTypeName: 'Markdown Document',
          CFBundleTypeRole: 'Editor',
          LSHandlerRank: 'Default',
          LSItemContentTypes: [
            'net.daringfireball.markdown',
            'public.plain-text',
          ],
        },
      ],
      UTImportedTypeDeclarations: [
        {
          UTTypeIdentifier: 'net.daringfireball.markdown',
          UTTypeDescription: 'Markdown Document',
          UTTypeConformsTo: ['public.plain-text'],
          UTTypeTagSpecification: {
            'public.filename-extension': ['md', 'markdown', 'mdown', 'mkd'],
          },
        },
      ],
    },

    osxSign: {
      identity: 'Apple Distribution: Eregion Labs LLC (4U4L9UVK62)',
      platform: 'mas',
      provisioningProfile: path.join(__dirname, 'build', 'InkBlot_Provisiong_Profile.provisionprofile'),
      optionsForFile: (filePath) => {
        if (filePath.includes('.app/')) {
          return {
            hardenedRuntime: false,
            entitlements: path.join(__dirname, 'build', 'entitlements.mas.inherit.plist'),
          };
        }
        return {
          hardenedRuntime: false,
          entitlements: path.join(__dirname, 'build', 'entitlements.mas.plist'),
        };
      },
    },
  },

  makers: [
    {
      name: '@electron-forge/maker-pkg',
      platforms: ['mas'],
      config: {
        identity: '3rd Party Mac Developer Installer: Eregion Labs LLC (4U4L9UVK62)',
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
