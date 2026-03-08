import UIKit
import SwiftUI

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    let storeManager = StoreManager()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        let browserVC = DocumentBrowserViewController()
        window.rootViewController = browserVC
        window.makeKeyAndVisible()
        self.window = window

        // Handle file opened via URL
        if let urlContext = connectionOptions.urlContexts.first {
            browserVC.openDocument(at: urlContext.url)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url,
              let browserVC = window?.rootViewController as? DocumentBrowserViewController else { return }
        browserVC.openDocument(at: url)
    }
}
