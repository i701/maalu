from typing import get_args

from app.dependencies import DbSession


def test_the_session_commits_before_the_response_is_sent():
    """The web app refetches as soon as a mutation answers. With the default scope FastAPI commits
    after the response has gone, so that refetch could read the old data (two-factor setup, for one,
    answered before its secret was saved). A real race cannot be reproduced through the test client,
    so this pins the setting that prevents it."""
    depends = next(a for a in get_args(DbSession) if hasattr(a, "dependency"))
    assert depends.scope == "function"
