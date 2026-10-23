import chess

from chess_trainer.features import FEATURE_NAMES, extract_features


def test_extract_features_has_stable_schema():
    features = extract_features(chess.Board(), 1200)
    assert features.shape == (len(FEATURE_NAMES),)
    assert features[0] == 1200
    assert features[3] == 20


def test_extract_features_handles_check_position():
    board = chess.Board("4k3/8/8/8/8/8/4R3/4K3 b - - 0 1")
    features = extract_features(board, 900)
    assert features[4] == 1
