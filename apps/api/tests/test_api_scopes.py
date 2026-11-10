from app import api_scopes as s


def need(method: str, path: str):
    return s.required_scope(method, path)


def test_reading_and_changing_are_different_permissions():
    assert need("GET", "/transactions") == "transactions:read"
    assert need("POST", "/transactions") == "transactions:write"
    assert need("PATCH", "/transactions/abc") == "transactions:write"
    assert need("DELETE", "/transactions/abc") == "transactions:delete"


def test_destructive_paths_need_delete_even_when_they_are_posts():
    assert need("POST", "/transactions/bulk/purge") == "transactions:delete"
    assert need("DELETE", "/transactions/abc/permanent") == "transactions:delete"
    # but moving things to the trash or back is only a change
    assert need("POST", "/transactions/bulk/trash") == "transactions:write"
    assert need("POST", "/transactions/abc/restore") == "transactions:write"


def test_reports_and_the_plan_are_their_own_areas():
    assert need("GET", "/transactions/categories") == "reports:read"
    assert need("GET", "/transactions/totals") == "reports:read"
    assert need("GET", "/stats/balance-trend") == "reports:read"
    assert need("GET", "/stats/available-to-spend") == "plan:read"
    assert need("GET", "/accounts/trends") == "accounts:read"


def test_what_must_stay_in_the_browser_is_out_of_reach_of_every_key():
    for method, path in [
        ("GET", "/auth/sessions"),
        ("POST", "/auth/password"),
        ("POST", "/auth/2fa/setup"),
        ("GET", "/users/me"),
        ("PATCH", "/users/me"),
        ("GET", "/backup"),
        ("POST", "/backup/restore"),
        ("GET", "/api-keys"),
        ("POST", "/api-keys"),
        ("GET", "/attachments/abc"),
        ("GET", "/transactions/abc/attachments"),
        ("GET", "/transactions/export"),
        ("GET", "/places/search"),
        ("POST", "/email/test"),
        ("GET", "/salary-rules"),
        ("POST", "/transactions/abc/salary-split"),
    ]:
        assert need(method, path) is None, (method, path)
        assert not s.allowed(s.ALL_SCOPES, method, path), (method, path)


def test_a_route_nobody_named_is_closed():
    assert need("GET", "/something-new") is None
    assert not s.allowed(s.ALL_SCOPES, "GET", "/something-new")


def test_public_data_is_readable_by_any_key_but_never_changed():
    assert s.allowed(set(), "GET", "/currencies")
    assert s.allowed(set(), "GET", "/whoami")
    assert not s.allowed(s.ALL_SCOPES, "POST", "/currencies")


def test_allowed_checks_the_scope_held():
    held = {"budget:read"}
    assert s.allowed(held, "GET", "/budget")
    assert not s.allowed(held, "POST", "/budget/lines")
    assert not s.allowed(held, "GET", "/accounts")


def test_a_prefix_is_matched_whole_so_a_longer_name_is_not_swept_in():
    # "/transactions" must not capture "/transactionsx", which is unknown and so closed
    assert need("GET", "/transactionsx") is None
    assert need("GET", "/accounts/abc/balance-history") == "accounts:read"


def test_every_role_is_made_of_known_scopes_and_none_can_delete():
    for name, role in s.ROLES.items():
        assert set(role["scopes"]) <= s.ALL_SCOPES, name
        assert not any(x.endswith(":delete") for x in role["scopes"]), name


def test_a_role_is_recognised_by_its_scopes_and_anything_else_is_custom():
    assert s.role_for(set(s.ROLES["viewer"]["scopes"])) == "viewer"
    assert s.role_for({"budget:read"}) == "custom"


def test_valid_scopes_refuses_unknown_ones_and_orders_the_rest():
    assert s.valid_scopes(["nope:read"]) is None
    assert s.valid_scopes(["budget:read", "accounts:read", "budget:read"]) == [
        "accounts:read",
        "budget:read",
    ]


def test_the_path_prefix_is_stripped():
    assert s.strip_prefix("/api/v1/budget") == "/budget"
