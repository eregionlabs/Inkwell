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

        // Handle file opened via URL — defer until view is ready
        if let urlContext = connectionOptions.urlContexts.first {
            let url = resolveIncomingURL(urlContext.url)
            browserVC.pendingURL = url
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let incomingURL = URLContexts.first?.url,
              let browserVC = window?.rootViewController as? DocumentBrowserViewController else { return }
        let url = resolveIncomingURL(incomingURL)
        browserVC.importAndOpen(url: url)
    }

    /// Resolve inkblot:// scheme URLs back to file URLs
    private func resolveIncomingURL(_ url: URL) -> URL {
        if url.scheme == "inkblot",
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let urlParam = components.queryItems?.first(where: { $0.name == "url" })?.value,
           let fileURL = URL(string: urlParam) {
            return fileURL
        }
        return url
    }
}
