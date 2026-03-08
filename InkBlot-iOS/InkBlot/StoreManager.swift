import StoreKit
import SwiftUI

@MainActor
class StoreManager: ObservableObject {
    static let productID = "com.eregionlabs.inkblot.fullaccess"
    private static let trialDuration: TimeInterval = 3 * 24 * 60 * 60 // 3 days

    @Published var isUnlocked: Bool = false
    @Published var product: Product?
    @Published var isPurchasing: Bool = false

    var isTrialExpired: Bool {
        let start = trialStartDate
        return Date().timeIntervalSince(start) > Self.trialDuration
    }

    private var trialStartDate: Date {
        let key = "inkblot_trial_start"
        if let stored = UserDefaults.standard.object(forKey: key) as? Date {
            return stored
        }
        let now = Date()
        UserDefaults.standard.set(now, forKey: key)
        return now
    }

    private var updateListenerTask: Task<Void, Never>?

    init() {
        updateListenerTask = listenForTransactions()
        Task {
            await checkEntitlements()
            await loadProduct()
        }
    }

    deinit {
        updateListenerTask?.cancel()
    }

    func loadProduct() async {
        do {
            let products = try await Product.products(for: [Self.productID])
            product = products.first
        } catch {
            print("Failed to load products: \(error)")
        }
    }

    func purchase() async {
        guard let product else { return }
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try checkVerified(verification)
                await transaction.finish()
                isUnlocked = true
            case .userCancelled, .pending:
                break
            @unknown default:
                break
            }
        } catch {
            print("Purchase failed: \(error)")
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await checkEntitlements()
    }

    private func checkEntitlements() async {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result),
               transaction.productID == Self.productID {
                isUnlocked = true
                return
            }
        }
    }

    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.failedVerification
        case .verified(let safe):
            return safe
        }
    }

    private func listenForTransactions() -> Task<Void, Never> {
        Task.detached { [weak self] in
            for await result in Transaction.updates {
                if let transaction = try? result.payloadValue {
                    await transaction.finish()
                    await MainActor.run {
                        if transaction.productID == StoreManager.productID {
                            self?.isUnlocked = true
                        }
                    }
                }
            }
        }
    }

    enum StoreError: Error {
        case failedVerification
    }
}
