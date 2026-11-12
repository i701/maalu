"""What an API key may do. Pure functions, no I/O.

A permission ("scope") is an **area** plus an **action**, written `area:action`, for example
`transactions:read` or `budget:read`. Areas follow what the app has; actions are `read`, `write`
(create and change) and `delete`, and each stands alone: reading does not imply writing, and
writing does not imply deleting.

A **role** is only a named starting set of scopes ("viewer", "assistant"). A key stores the scopes
it was given, not the role's name, so changing what a role means later never widens a key that
already exists.

**What a key can reach is decided here, by method and path, and it is closed by default**: a route
that is not named in `ROUTES` is out of reach of every key. Sign-in, passwords, two-factor,
sessions, the full backup, receipts, the export, the keys themselves and anything that moves money
by itself (salary rules) are deliberately not in it: those stay browser-only."""

AREAS: dict[str, str] = {
    "accounts": "Accounts, cards and their balances",
    "transactions": "Transactions, groups and templates",
    "categories": "Categories",
    "vendors": "Vendors",
    "tags": "Tags",
    "budget": "The budget and its limits",
    "goals": "Savings goals",
    "subscriptions": "Subscriptions and suggestions",
    "plan": "The month plan and available to spend",
    "reports": "Reports: totals, categories, trends, net worth",
    "import": "Statement import",
    "notifications": "Notifications",
}

ACTIONS: dict[str, str] = {
    "read": "See it",
    "write": "Add and change",
    "delete": "Delete",
}

ALL_SCOPES: frozenset[str] = frozenset(f"{a}:{x}" for a in AREAS for x in ACTIONS)

_READ_ALL = [f"{a}:read" for a in AREAS]

ROLES: dict[str, dict] = {
    "viewer": {
        "label": "Viewer",
        "description": "Read everything the keys can reach. Cannot change anything.",
        "scopes": _READ_ALL,
    },
    "reports": {
        "label": "Reports only",
        "description": "The month plan, the budget and the reports. Nothing else.",
        "scopes": ["plan:read", "budget:read", "reports:read"],
    },
    "assistant": {
        "label": "Assistant",
        "description": "Read everything, and add or change transactions (for a bot that logs "
        "spending). Cannot delete.",
        "scopes": [*_READ_ALL, "transactions:write"],
    },
    "editor": {
        "label": "Editor",
        "description": "Read everything and add or change anything the keys can reach. Cannot "
        "delete.",
        "scopes": [*_READ_ALL, *[f"{a}:write" for a in AREAS]],
    },
}

CUSTOM = "custom"


def role_for(scopes: set[str] | frozenset[str]) -> str:
    """The role whose scopes are exactly `scopes`, else "custom"."""
    for name, role in ROLES.items():
        if set(role["scopes"]) == set(scopes):
            return name
    return CUSTOM


def valid_scopes(scopes: list[str]) -> list[str] | None:
    """The scopes, deduplicated and in catalogue order, or None when any is unknown."""
    if not set(scopes) <= ALL_SCOPES:
        return None
    return sorted(set(scopes), key=lambda s: (list(AREAS).index(s.split(":")[0]), s))


# ── Routes ───────────────────────────────────────────────────────────────────────────────────
# (path prefix, area), most specific first. `None` as the area means "no key, whatever its scopes".
# "public" means any key may read it (a list of currencies: nothing private in it).
ROUTES: list[tuple[str, str | None]] = [
    # never for a key
    ("/auth", None),
    ("/users", None),
    ("/backup", None),
    ("/email", None),
    ("/api-keys", None),
    ("/attachments", None),
    ("/places", None),  # place search sends what is typed to another service
    ("/salary-rules", None),  # these move money between accounts by themselves
    ("/salary-split-tasks", None),
    ("/transactions/export", None),
    # reports: totals and breakdowns of transactions
    ("/transactions/categories", "reports"),
    ("/transactions/totals", "reports"),
    ("/transactions/places", "reports"),
    ("/stats/available-to-spend", "plan"),
    ("/stats", "reports"),
    # areas
    ("/transactions/transfer-suggestions", "transactions"),
    ("/transactions", "transactions"),
    ("/groups", "transactions"),
    ("/templates", "transactions"),
    ("/accounts", "accounts"),
    ("/cards", "accounts"),
    ("/categories", "categories"),
    ("/vendors", "vendors"),
    ("/tags", "tags"),
    ("/budget", "budget"),
    ("/goals", "goals"),
    ("/subscriptions", "subscriptions"),
    ("/imports", "import"),
    ("/notifications", "notifications"),
    ("/currencies", "public"),
    ("/whoami", "public"),
    ("/server", "public"),
]

_DELETING_SUFFIXES = ("/purge", "/permanent")
# Parts of a transaction that no key may reach (receipts; the salary split moves money).
_NEVER_SEGMENTS = ("/attachments", "/salary-split")


def action_for(method: str, path: str) -> str:
    """read, write or delete: what a request does, by its method (and a few destructive paths)."""
    method = method.upper()
    if method == "DELETE" or path.endswith(_DELETING_SUFFIXES):
        return "delete"
    if method in ("GET", "HEAD", "OPTIONS"):
        return "read"
    return "write"


def area_of(path: str) -> str | bool | None:
    """The area a path belongs to; None when no key may reach it; False when it is unknown (which
    is treated the same: closed by default)."""
    # a receipt or a salary split hangs off a transaction's path, so it is caught wherever it sits
    if any(f"{segment}/" in path + "/" for segment in _NEVER_SEGMENTS):
        return None
    for prefix, area in ROUTES:
        if path == prefix or path.startswith(prefix + "/"):
            return area
    return False


def required_scope(method: str, path: str) -> str | None:
    """The scope a request needs, or None when a key may never make it. `path` is the route's path
    without `/api/v1`. A "public" area needs no scope but only reading."""
    area = area_of(path)
    if not area:
        return None
    action = action_for(method, path)
    if area == "public":
        return "public:read" if action == "read" else None
    return f"{area}:{action}"


def allowed(scopes: set[str] | frozenset[str], method: str, path: str) -> bool:
    """Whether a key holding `scopes` may make this request."""
    need = required_scope(method, path)
    if need is None:
        return False
    return need == "public:read" or need in scopes


def strip_prefix(path: str) -> str:
    """`/api/v1/budget` -> `/budget`."""
    return path.removeprefix("/api/v1") or "/"
