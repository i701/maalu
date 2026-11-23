import SwiftUI

/// The bank an account is with, beside its name: its name and, where the app has one, its logo, in the bank's colour; a plain grey chip for any other bank.
struct AccountBankChip: View {
    let bank: String
    @Environment(\.colorScheme) private var scheme

    private static let brands: [String: (logo: String, tint: Color)] = [
        "mib": ("BankMIB", Color(red: 0, green: 0.416, blue: 0.302)),
        "bml": ("BankBML", Color(red: 0.886, green: 0.106, blue: 0.137)),
    ]

    var body: some View {
        let brand = Self.brands[bank.trimmingCharacters(in: .whitespaces).lowercased()]
        HStack(spacing: 5) {
            Text(bank)
            if let brand {
                Image(brand.logo)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 16, height: 16)
                    .clipShape(.rect(cornerRadius: 4, style: .continuous))
            }
        }
        .font(.caption.weight(.semibold))
        .lineLimit(1)
        .foregroundStyle(brand.map { scheme == .dark ? $0.tint.mix(with: .white, by: 0.5) : $0.tint } ?? .secondary)
        .padding(.leading, 8)
        .padding(.trailing, brand == nil ? 8 : 5)
        .padding(.vertical, 4)
        .background(brand?.tint.opacity(0.14) ?? Color.secondary.opacity(0.15), in: .rect(cornerRadius: 8, style: .continuous))
    }
}
