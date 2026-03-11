import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedContent()
    }

    private func handleSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            close()
            return
        }

        let markdownType = "net.daringfireball.markdown"
        let plainTextType = UTType.plainText.identifier
        let fileURLType = UTType.fileURL.identifier

        for item in extensionItems {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                if provider.hasItemConformingToTypeIdentifier(markdownType) ||
                   provider.hasItemConformingToTypeIdentifier(plainTextType) ||
                   provider.hasItemConformingToTypeIdentifier(fileURLType) {
                    provider.loadItem(forTypeIdentifier: fileURLType) { [weak self] item, _ in
                        if let url = item as? URL {
                            self?.openInApp(url: url)
                        } else {
                            self?.close()
                        }
                    }
                    return
                }
            }
        }
        close()
    }

    private func openInApp(url: URL) {
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        guard let appURL = URL(string: "inkblot://open?url=\(encoded)") else {
            close()
            return
        }

        // Extensions can't use UIApplication.shared directly — use the responder chain
        var responder: UIResponder? = self as UIResponder
        let selector = sel_registerName("openURL:")
        while let r = responder {
            if r.responds(to: selector) {
                r.perform(selector, with: appURL)
                break
            }
            responder = r.next
        }

        // Give the system a moment to process before closing
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.close()
        }
    }

    private func close() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
