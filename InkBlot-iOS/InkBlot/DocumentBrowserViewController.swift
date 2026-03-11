import UIKit
import SwiftUI
import UniformTypeIdentifiers

class DocumentBrowserViewController: UIDocumentBrowserViewController, UIDocumentBrowserViewControllerDelegate {

    /// Set by SceneDelegate when file URL arrives before view is ready
    var pendingURL: URL?

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
                            self?.dismiss(animated: true) {
                                // Open pending file after welcome is dismissed
                                self?.processPendingURL()
                            }
                        }
                    }
                ))
            )
            welcomeVC.modalPresentationStyle = .fullScreen
            welcomeVC.view.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
            present(welcomeVC, animated: true)
        } else {
            processPendingURL()
        }
    }

    private func processPendingURL() {
        guard let url = pendingURL else { return }
        pendingURL = nil
        importAndOpen(url: url)
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

    // MARK: - Import & Open

    /// Import a file through the document browser (handles sandbox/security properly)
    func importAndOpen(url: URL) {
        // First try to copy the file to our sandbox via the Inbox
        let inbox = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("Inbox")
        try? FileManager.default.createDirectory(at: inbox, withIntermediateDirectories: true)

        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }

        // Try reading directly first (works for files already in our sandbox)
        if let data = try? Data(contentsOf: url), let text = String(data: data, encoding: .utf8) {
            presentDocument(text: text, fileName: url.deletingPathExtension().lastPathComponent, fileURL: url)
            return
        }

        // If direct read fails, copy to Inbox then open
        let dest = inbox.appendingPathComponent(url.lastPathComponent)
        try? FileManager.default.removeItem(at: dest)
        if let _ = try? FileManager.default.copyItem(at: url, to: dest),
           let data = try? Data(contentsOf: dest),
           let text = String(data: data, encoding: .utf8) {
            presentDocument(text: text, fileName: dest.deletingPathExtension().lastPathComponent, fileURL: dest)
            return
        }

        // If everything fails, use revealDocument which handles import natively
        revealDocument(at: url, importIfNeeded: true) { [weak self] revealedURL, error in
            guard let revealedURL = revealedURL, error == nil else { return }
            DispatchQueue.main.async {
                self?.openDocument(at: revealedURL)
            }
        }
    }

    // MARK: - Open Document

    func openDocument(at url: URL) {
        let accessing = url.startAccessingSecurityScopedResource()

        do {
            let data = try Data(contentsOf: url)
            guard let text = String(data: data, encoding: .utf8) else {
                if accessing { url.stopAccessingSecurityScopedResource() }
                return
            }
            if accessing { url.stopAccessingSecurityScopedResource() }
            presentDocument(text: text, fileName: url.deletingPathExtension().lastPathComponent, fileURL: url)
        } catch {
            if accessing { url.stopAccessingSecurityScopedResource() }
        }
    }

    private func presentDocument(text: String, fileName: String, fileURL: URL) {
        // Dismiss any existing presented view controller first
        if presentedViewController != nil {
            dismiss(animated: false) { [weak self] in
                self?.showDocumentReader(text: text, fileName: fileName, fileURL: fileURL)
            }
        } else {
            showDocumentReader(text: text, fileName: fileName, fileURL: fileURL)
        }
    }

    private func showDocumentReader(text: String, fileName: String, fileURL: URL) {
        let storeManager = (UIApplication.shared.delegate as? AppDelegate)?.storeManager ?? StoreManager()

        let contentView = DocumentReaderView(
            markdown: text,
            fileName: fileName,
            fileURL: fileURL
        )
        .environmentObject(storeManager)

        let hostingVC = UIHostingController(rootView: contentView)
        hostingVC.view.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
        hostingVC.modalPresentationStyle = .fullScreen

        present(hostingVC, animated: true)
    }
}
