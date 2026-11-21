import Testing
@testable import Maalu

struct TransferSlabsTests {
    private func draft(from: String?, to: String?) -> TransactionDraft {
        var draft = TransactionDraft()
        draft.type = .transfer
        draft.accountID = from
        draft.toAccountID = to
        return draft
    }

    @Test func reversingSwapsTheAccountsAndLeavesAnAmountInOneCurrency() {
        var draft = draft(from: "a", to: "b")
        draft.amount = 100
        draft.reverseTransfer(inTwoCurrencies: false)
        #expect(draft.accountID == "b" && draft.toAccountID == "a")
        #expect(draft.amount == 100)
    }

    @Test func reversingAlsoSwapsTheAmountsInTwoCurrencies() {
        var draft = draft(from: "a", to: "b")
        draft.amount = 100
        draft.toAmount = 6
        draft.reverseTransfer(inTwoCurrencies: true)
        #expect(draft.amount == 6 && draft.toAmount == 100)
    }

    @Test func pickingTheAccountOnTheOtherSideSwapsThemInsteadOfRepeatingOne() {
        var draft = draft(from: "a", to: "b")
        draft.chooseTransferAccount("b", forSource: true)
        #expect(draft.accountID == "b" && draft.toAccountID == "a")
        draft.chooseTransferAccount("b", forSource: false)
        #expect(draft.accountID == "a" && draft.toAccountID == "b")
    }

    @Test func pickingAFreshAccountOnlyReplacesThatSide() {
        var draft = draft(from: "a", to: nil)
        draft.chooseTransferAccount("c", forSource: false)
        #expect(draft.accountID == "a" && draft.toAccountID == "c")
    }
}
