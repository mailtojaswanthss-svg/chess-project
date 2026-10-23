from chess_trainer.ingest import parse_usernames


def test_parse_usernames_accepts_commas_and_spaces():
    assert parse_usernames("alice, bob  carol") == ["alice", "bob", "carol"]
