import numpy as np

from chess_trainer.model import BlunderModel, train_and_evaluate


def test_model_trains_and_round_trips(tmp_path):
    x = np.array([[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]], dtype=float)
    y = np.array([0, 0, 0, 1, 1, 1])
    model, evaluation = train_and_evaluate(x, y, x, y)
    assert 0 <= evaluation.accuracy <= 1
    path = tmp_path / "model.joblib"
    model.save(path)
    loaded = BlunderModel.load(path)
    assert 0 <= loaded.predict_probability(np.array([1, 1])) <= 1
