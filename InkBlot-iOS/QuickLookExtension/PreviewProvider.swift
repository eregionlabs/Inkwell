import QuickLook
import WebKit

class PreviewProvider: QLPreviewProvider, QLPreviewingController {
    func providePreview(for request: QLFilePreviewRequest) async throws -> QLPreviewReply {
        let fileURL = request.fileURL
        let markdown = try String(contentsOf: fileURL, encoding: .utf8)
        let html = renderHTML(from: markdown)
        let data = Data(html.utf8)

        return QLPreviewReply(dataOfContentType: .html, contentSize: CGSize(width: 600, height: 800)) { _ in
            return data
        }
    }

    private func renderHTML(from markdown: String) -> String {
        let escaped = markdown
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "`", with: "\\`")
            .replacingOccurrences(of: "$", with: "\\$")

        let css: String = {
            if let url = Bundle(for: PreviewProvider.self).url(forResource: "preview", withExtension: "css"),
               let content = try? String(contentsOf: url, encoding: .utf8) {
                return content
            }
            return ""
        }()

        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
        \(css)

        :root { color-scheme: light dark; }
        body { margin: 0; padding: 0; background: #faf9f7; }
        .preview-content {
            padding: 20px;
            font-size: 16px;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --preview-text: #e8e4de;
                --preview-text-light: #a09890;
                --preview-accent: #5a9bf5;
                --preview-border: rgba(255, 255, 255, 0.08);
                --preview-bg-code: #1e1d1b;
                --preview-bg-table-alt: #1a1918;
            }
            body { background: #141312; }
        }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
        </head>
        <body>
        <div id="preview" class="preview-content"></div>
        <script>
        const md = markdownit({ html: true, linkify: true, typographer: true });
        document.getElementById('preview').innerHTML = md.render(`\(escaped)`);
        </script>
        </body>
        </html>
        """
    }
}
