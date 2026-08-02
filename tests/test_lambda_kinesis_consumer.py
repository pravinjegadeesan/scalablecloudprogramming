import base64
import importlib.util
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

MODULE_PATH = Path(__file__).resolve().parents[1] / "lambda" / "lambda_kinesis_consumer.py"
SPEC = importlib.util.spec_from_file_location("lambda_kinesis_consumer", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

lambda_handler = module.lambda_handler


def test_lambda_handler_processes_valid_kinesis_records():
    fake_payload = {
        "track": "Test Song",
        "artist": "Test Artist",
        "listeners": 150,
        "playcount": 600,
        "timestamp": "2026-08-02T23:00:00Z",
    }

    event = {
        "Records": [
            {
                "kinesis": {
                    "data": base64.b64encode(json.dumps(fake_payload).encode("utf-8")).decode("utf-8")
                }
            }
        ]
    }

    mock_table = MagicMock()
    mock_s3 = MagicMock()

    with patch.object(module, "table", mock_table), patch.object(module, "s3", mock_s3):
        response = lambda_handler(event, None)

    assert response["statusCode"] == 200
    mock_table.put_item.assert_called_once()
    mock_s3.put_object.assert_called_once()

    saved_item = mock_table.put_item.call_args.kwargs["Item"]
    assert saved_item["track"] == "Test Song"
    assert "event_id" in saved_item
    assert "processed_at" in saved_item
    assert saved_item["artist"] == "Test Artist"


def test_lambda_handler_skips_invalid_records_without_crashing():
    event = {
        "Records": [
            {"kinesis": {"data": "not-valid-base64"}},
            {"kinesis": {"data": base64.b64encode(b'{"track": "ok"}').decode("utf-8")}},
        ]
    }

    mock_table = MagicMock()
    mock_s3 = MagicMock()

    with patch.object(module, "table", mock_table), patch.object(module, "s3", mock_s3):
        response = lambda_handler(event, None)

    assert response["statusCode"] == 200
    assert mock_table.put_item.call_count == 1
    assert mock_s3.put_object.call_count == 1
