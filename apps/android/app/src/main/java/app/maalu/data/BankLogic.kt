package app.maalu.data

// Ported from apps/web/src/lib/banks.ts: the banks the app knows the look of.
enum class BankBrand { Mib, Bml }

/** The brand of a bank by the name typed on the account (any case, spaces around ignored), or null for any other bank. */
fun bankBrand(bank: String): BankBrand? = BankBrand.entries.firstOrNull { it.name.equals(bank.trim(), ignoreCase = true) }

/** The Dashboard's title: a greeting once the person has a name (set on the web). */
fun dashboardTitle(name: String?): String = if (name.isNullOrBlank()) "Dashboard" else "Hi, $name"
