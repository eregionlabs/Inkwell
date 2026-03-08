import UIKit
import SwiftUI
import UniformTypeIdentifiers

class DocumentBrowserViewController: UIDocumentBrowserViewController, UIDocumentBrowserViewControllerDelegate {

    override func viewDidLoad() {
        super.viewDidLoad()

        delegate = self
        allowsDocumentCreation = false
        allowsPickingMultipleItems = false

        // Warm rice-paper tint
        let tintColor = UIColor(red: 90/255, green: 123/255, blue: 94/255, alpha: 1)
        view.tintColor = tintColor
        browserUserInterfaceStyle = .light

        // Style the browser's appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 0.95)
        appearance.titleTextAttributes = [
            .foregroundColor: UIColor(red: 47/255, green: 43/255, blue: 38/255, alpha: 1),
            .font: UIFont.systemFont(ofSize: 17, weight: .semibold)
        ]
        appearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(red: 47/255, green: 43/255, blue: 38/255, alpha: 1),
            .font: UIFont.systemFont(ofSize: 34, weight: .bold)
        ]

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance

        // Tab bar styling
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithDefaultBackground()
        tabAppearance.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 0.95)
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        // Show welcome on first launch
        if !UserDefaults.standard.bool(forKey: "inkblot_onboarding_complete") {
            let welcomeVC = UIHostingController(rootView:
                WelcomeView(isPresented: .init(
                    get: { true },
                    set: { [weak self] dismissed in
                        if !dismissed {
                            self?.dismiss(animated: true)
                        }
                    }
                ))
            )
            welcomeVC.modalPresentationStyle = .fullScreen
            welcomeVC.view.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
            present(welcomeVC, animated: true)
        }
    }

    // MARK: - UIDocumentBrowserViewControllerDelegate

    func documentBrowser(_ controller: UIDocumentBrowserViewController, didPickDocumentsAt documentURLs: [URL]) {
        guard let url = documentURLs.first else { return }
        openDocument(at: url)
    }

    func documentBrowser(_ controller: UIDocumentBrowserViewController, didRequestDocumentCreationWithHandler importHandler: @escaping (URL?, UIDocumentBrowserViewController.ImportMode) -> Void) {
        importHandler(nil, .none)
    }

    func documentBrowser(_ controller: UIDocumentBrowserViewController, didImportDocumentAt sourceURL: URL, toDestinationURL destinationURL: URL) {
        openDocument(at: destinationURL)
    }

    func documentBrowser(_ controller: UIDocumentBrowserViewController, failedToImportDocumentAt documentURL: URL, error: (any Error)?) {
        // Handle error silently
    }

    // MARK: - Open Document

    func openDocument(at url: URL) {
        let accessing = url.startAccessingSecurityScopedResource()

        do {
            let data = try Data(contentsOf: url)
            guard let text = String(data: data, encoding: .utf8) else { return }

            let fileName = url.deletingPathExtension().lastPathComponent
            let storeManager = (UIApplication.shared.delegate as? AppDelegate)?.storeManager ?? StoreManager()

            let contentView = DocumentReaderView(
                markdown: text,
                fileName: fileName,
                fileURL: url
            )
            .environmentObject(storeManager)

            let hostingVC = UIHostingController(rootView: contentView)
            hostingVC.view.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
            hostingVC.modalPresentationStyle = .fullScreen

            present(hostingVC, animated: true) {
                if accessing {
                    url.stopAccessingSecurityScopedResource()
                }
            }
        } catch {
            if accessing {
                url.stopAccessingSecurityScopedResource()
            }
        }
    }
}
