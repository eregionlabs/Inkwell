import SwiftUI

struct ContentView: View {
    let document: MarkdownDocument
    @EnvironmentObject var storeManager: StoreManager
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            MarkdownWebView(markdown: document.text)
                .ignoresSafeArea(edges: .bottom)

            if showPaywall {
                PaywallView()
                    .environmentObject(storeManager)
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                ShareLink(item: document.text) {
                    Image(systemName: "square.and.arrow.up")
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
