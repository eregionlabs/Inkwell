import SwiftUI

struct DocumentReaderView: View {
    let markdown: String
    let fileName: String
    let fileURL: URL
    @EnvironmentObject var storeManager: StoreManager
    @Environment(\.dismiss) private var dismiss
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 245/255, green: 240/255, blue: 232/255)
                    .ignoresSafeArea()

                MarkdownWebView(markdown: markdown)
                    .ignoresSafeArea(edges: .bottom)

                if showPaywall {
                    PaywallView()
                        .environmentObject(storeManager)
                }
            }
            .navigationTitle(fileName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color(red: 245/255, green: 240/255, blue: 232/255).opacity(0.95), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button {
                        // Dismiss back to document browser
                        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                           let rootVC = windowScene.windows.first?.rootViewController {
                            rootVC.dismiss(animated: true)
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Files")
                                .font(.system(size: 17))
                        }
                        .foregroundColor(Color(red: 90/255, green: 123/255, blue: 94/255))
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    ShareLink(item: markdown) {
                        Image(systemName: "square.and.arrow.up")
                            .foregroundColor(Color(red: 90/255, green: 123/255, blue: 94/255))
                    }
                }
            }
        }
        .onAppear {
            checkAccess()
        }
        .onChange(of: storeManager.isUnlocked) {
            checkAccess()
        }
    }

    private func checkAccess() {
        showPaywall = !storeManager.isUnlocked && storeManager.isTrialExpired
    }
}
