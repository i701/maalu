import Foundation

/// Names a sign-in from the user agent it reported, like the web's and Android's `describeDevice`.
enum DeviceName {
    static func describe(_ userAgent: String?) -> String {
        guard let agent = userAgent, !agent.trimmingCharacters(in: .whitespaces).isEmpty else { return "Unknown device" }
        if agent.hasPrefix("Maalu-iOS") { return "Maalu app on iOS" }
        if agent.hasPrefix("Maalu-Android") { return "Maalu app on Android" }
        let browser = first(of: [
            ("Edge", #"\bEdg(e|A|iOS)?/"#), ("Opera", #"\b(OPR|Opera)/"#), ("Firefox", #"\b(Firefox|FxiOS)/"#),
            ("Chrome", #"\b(Chrome|CriOS)/"#), ("Safari", #"Version/.*Safari/"#), ("curl", #"^curl/"#),
        ], in: agent)
        let system = first(of: [
            ("Android", "Android"), ("iOS", "iPhone|iPad|iPod"), ("Windows", "Windows"),
            ("macOS", "Mac OS X|Macintosh"), ("ChromeOS", "CrOS"), ("Linux", "Linux|X11"),
        ], in: agent)
        if let browser, let system { return "\(browser) on \(system)" }
        return browser ?? system ?? "Unknown device"
    }

    /// "5 minutes ago"; a time that cannot be read is shown as it came.
    static func ago(_ iso: String, now: Date = .now) -> String {
        let plain = ISO8601DateFormatter()
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = fractional.date(from: iso) ?? plain.date(from: iso) else { return iso }
        if now.timeIntervalSince(date) < 60 { return "just now" }
        return date.formatted(.relative(presentation: .named, unitsStyle: .wide).locale(Locale(identifier: "en")))
    }

    private static func first(of patterns: [(String, String)], in text: String) -> String? {
        patterns.first { text.range(of: $0.1, options: [.regularExpression, .caseInsensitive]) != nil }?.0
    }
}
