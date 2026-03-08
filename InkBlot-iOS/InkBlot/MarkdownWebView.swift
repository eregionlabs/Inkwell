import SwiftUI
import WebKit

struct MarkdownWebView: UIViewRepresentable {
    let markdown: String

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 245/255, green: 240/255, blue: 232/255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .always
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let html = buildHTML(from: markdown)
        webView.loadHTMLString(html, baseURL: nil)
    }

    private func buildHTML(from markdown: String) -> String {
        let escaped = markdown
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "`", with: "\\`")
            .replacingOccurrences(of: "$", with: "\\$")

        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <style>
        \(Self.previewCSS)

        /* iOS — Rice Paper */
        :root {
            color-scheme: light dark;
        }

        body {
            margin: 0;
            padding: 0;
            background: #f5f0e8;
            -webkit-text-size-adjust: 100%;
        }

        /* Subtle paper texture via radial noise */
        body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background-image:
                radial-gradient(ellipse at 20% 50%, rgba(180, 160, 120, 0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 20%, rgba(160, 140, 100, 0.03) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 80%, rgba(170, 150, 110, 0.03) 0%, transparent 50%);
            pointer-events: none;
            z-index: 0;
        }

        .preview-content {
            position: relative;
            z-index: 1;
            padding: 28px 24px 100px;
            font-size: 17px;
            line-height: 1.78;
        }

        .preview-content pre {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .preview-content img {
            max-width: 100%;
            height: auto;
        }

        .preview-content table {
            display: block;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --preview-text: #ddd8d0;
                --preview-text-light: #958e84;
                --preview-heading: #ece8e2;
                --preview-accent: #7ba37e;
                --preview-accent-light: rgba(123, 163, 126, 0.15);
                --preview-border: rgba(200, 180, 150, 0.08);
                --preview-bg-code: rgba(200, 180, 150, 0.06);
                --preview-bg-table-alt: rgba(200, 180, 150, 0.04);
                --preview-blockquote-bar: rgba(123, 163, 126, 0.30);
                --preview-hr: rgba(200, 180, 150, 0.10);
            }
            body {
                background: #1a1815;
            }
            body::before {
                background-image:
                    radial-gradient(ellipse at 20% 50%, rgba(100, 85, 60, 0.05) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 20%, rgba(90, 75, 50, 0.04) 0%, transparent 50%);
            }
        }
        </style>
        <script src="https://cdn.jsdelivr.net/npm/markdown-it@14/dist/markdown-it.min.js"></script>
        </head>
        <body>
        <div id="preview" class="preview-content"></div>
        <script>
        const md = markdownit({ html: true, linkify: true, typographer: true });
        const source = `\(escaped)`;
        document.getElementById('preview').innerHTML = md.render(source);
        </script>
        </body>
        </html>
        """
    }

    private static let previewCSS: String = {
        if let url = Bundle.main.url(forResource: "preview", withExtension: "css"),
           let css = try? String(contentsOf: url) {
            return css
        }
        return ""
    }()
}
