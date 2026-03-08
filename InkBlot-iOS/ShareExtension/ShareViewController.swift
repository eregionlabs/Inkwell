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
                        }
                    }
                    return
                }
            }
        }
        close()
    }

    private func openInApp(url: URL) {
        // Construct a URL that the main app handles
        let encoded = url.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let appURL = URL(string: "inkblot://open?url=\(encoded)") {
            var responder: UIResponder? = self
            while let r = responder {
                if let application = r as? UIApplication {
                    application.open(appURL)
                    break
                }
                responder = r.next
            }
        }
        close()
    }

    private func close() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
