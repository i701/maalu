class TransactionRuleError(Exception):
    """A business-rule violation on a transaction (e.g. a transfer to the same account).

    The message is safe to show to the user; the API turns it into a 422.
    """
