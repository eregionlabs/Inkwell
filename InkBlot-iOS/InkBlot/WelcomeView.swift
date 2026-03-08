import SwiftUI

struct WelcomeView: View {
    @Binding var isPresented: Bool
    @State private var currentPage = 0
    @State private var appeared = false

    private let pages: [WelcomePage] = [
        WelcomePage(
            icon: "doc.text",
            title: "Beautiful Markdown,\nEverywhere",
            subtitle: "Open any .md file and see it rendered with elegant typography on a warm, eye-friendly surface.",
            accent: Color(red: 90/255, green: 123/255, blue: 94/255)
        ),
        WelcomePage(
            icon: "eye",
            title: "Designed for\nReading",
            subtitle: "Serif typography, generous spacing, and a rice-paper palette crafted to be gentle on your eyes — day or night.",
            accent: Color(red: 140/255, green: 110/255, blue: 70/255)
        ),
        WelcomePage(
            icon: "square.and.arrow.up",
            title: "Open from\nAnywhere",
            subtitle: "Tap a .md file in Mail, Messages, Files, or Safari. InkBlot renders it instantly — no import, no conversion.",
            accent: Color(red: 90/255, green: 123/255, blue: 94/255)
        ),
    ]

    var body: some View {
        ZStack {
            // Rice paper background
            Color(red: 245/255, green: 240/255, blue: 232/255)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Page content
                TabView(selection: $currentPage) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        pageView(pages[index])
                            .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 400)

                // Page dots
                HStack(spacing: 8) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        Circle()
                            .fill(index == currentPage
                                  ? Color(red: 90/255, green: 123/255, blue: 94/255)
                                  : Color(red: 90/255, green: 123/255, blue: 94/255).opacity(0.2))
                            .frame(width: 7, height: 7)
                            .animation(.easeInOut(duration: 0.25), value: currentPage)
                    }
                }
                .padding(.top, 24)

                Spacer()
                    .frame(height: 48)

                // CTA button
                Button {
                    if currentPage < pages.count - 1 {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            currentPage += 1
                        }
                    } else {
                        dismiss()
                    }
                } label: {
                    Text(currentPage < pages.count - 1 ? "Continue" : "Start Reading")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color(red: 90/255, green: 123/255, blue: 94/255))
                        )
                }
                .padding(.horizontal, 40)

                // Skip on non-last pages
                if currentPage < pages.count - 1 {
                    Button("Skip") {
                        dismiss()
                    }
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(Color(red: 154/255, green: 147/255, blue: 136/255))
                    .padding(.top, 14)
                } else {
                    Spacer().frame(height: 38)
                }

                Spacer()
                    .frame(height: 40)
            }
        }
        .opacity(appeared ? 1 : 0)
        .onAppear {
            withAnimation(.easeOut(duration: 0.5)) {
                appeared = true
            }
        }
    }

    private func pageView(_ page: WelcomePage) -> some View {
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(page.accent.opacity(0.1))
                    .frame(width: 80, height: 80)
                Image(systemName: page.icon)
                    .font(.system(size: 32, weight: .light))
                    .foregroundColor(page.accent)
            }
            .padding(.bottom, 8)

            Text(page.title)
                .font(.system(size: 28, weight: .bold, design: .default))
                .multilineTextAlignment(.center)
                .foregroundColor(Color(red: 47/255, green: 43/255, blue: 38/255))
                .lineSpacing(4)

            Text(page.subtitle)
                .font(.system(size: 16, weight: .regular, design: .serif))
                .multilineTextAlignment(.center)
                .foregroundColor(Color(red: 120/255, green: 116/255, blue: 108/255))
                .lineSpacing(5)
                .padding(.horizontal, 40)
        }
        .padding(.horizontal, 24)
    }

    private func dismiss() {
        UserDefaults.standard.set(true, forKey: "inkblot_onboarding_complete")
        withAnimation(.easeOut(duration: 0.3)) {
            isPresented = false
        }
    }
}

private struct WelcomePage {
    let icon: String
    let title: String
    let subtitle: String
    let accent: Color
}
