import SwiftUI

struct PaywallView: View {
    @EnvironmentObject var storeManager: StoreManager

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("✒️")
                    .font(.system(size: 48))

                Text("Your free trial has ended")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)

                if let product = storeManager.product {
                    Text("Unlock InkBlot forever for just \(product.displayPrice)")
                        .font(.body)
                        .foregroundColor(.secondary)
                } else {
                    Text("Unlock InkBlot forever for just $4.99")
                        .font(.body)
                        .foregroundColor(.secondary)
                }

                Text("Beautiful markdown rendering on your iPhone")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Button {
                    Task { await storeManager.purchase() }
                } label: {
                    if storeManager.isPurchasing {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    } else {
                        Text("Unlock InkBlot — \(storeManager.product?.displayPrice ?? "$4.99")")
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Color(red: 58/255, green: 123/255, blue: 213/255))
                .disabled(storeManager.isPurchasing)

                Button("Restore Purchase") {
                    Task { await storeManager.restore() }
                }
                .font(.subheadline)
                .foregroundColor(.secondary)

                HStack(spacing: 4) {
                    Link("Terms of Use (EULA)", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
                    Text("·").foregroundColor(.secondary)
                    Link("Privacy Policy", destination: URL(string: "https://eregionlabs.com/privacy-policy")!)
                }
                .font(.caption2)
                .foregroundColor(Color(white: 0.6))
            }
            .padding(32)
            .background(.regularMaterial)
            .cornerRadius(20)
            .padding(.horizontal, 32)
        }
    }
}
