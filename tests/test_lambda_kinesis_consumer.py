import base64
import importlib.util
import json
import sys
import types
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

fastapi_module = types.ModuleType("fastapi")

class DummyFastAPI:
    def __init__(self, *args, **kwargs):
        pass

    def add_middleware(self, *args, **kwargs):
        pass

    def get(self, *args, **kwargs):
        def decorator(func):
            return func
        return decorator

fastapi_module.FastAPI = DummyFastAPI

middleware_module = types.ModuleType("fastapi.middleware")
cors_module = types.ModuleType("fastapi.middleware.cors")

class DummyCORSMiddleware:
    def __init__(self, *args, **kwargs):
        pass

cors_module.CORSMiddleware = DummyCORSMiddleware
middleware_module.cors = cors_module

sys.modules.setdefault("fastapi", fastapi_module)
sys.modules.setdefault("fastapi.middleware", middleware_module)
sys.modules.setdefault("fastapi.middleware.cors", cors_module)

MODULE_PATH = Path(__file__).resolve().parents[1] / "lambda" / "lambda_kinesis_consumer.py"
SPEC = importlib.util.spec_from_file_location("lambda_kinesis_consumer", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)

lambda_handler = module.lambda_handler

api_main_spec = importlib.util.spec_from_file_location(
    "api_main",
    Path(__file__).resolve().parents[1] / "api" / "main.py",
)
api_main = importlib.util.module_from_spec(api_main_spec)
api_main_spec.loader.exec_module(api_main)


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


def test_trending_now_aggregates_last_5_minutes_from_music_events():
    now = datetime.utcnow()
    items = [
        {
            "track": "Song A",
            "artist": "Artist A",
            "playcount": 10,
            "timestamp": (now - timedelta(minutes=1)).isoformat(),
        },
        {
            "track": "Song A",
            "artist": "Artist A",
            "playcount": 15,
            "timestamp": (now - timedelta(minutes=2)).isoformat(),
        },
        {
            "track": "Song B",
            "artist": "Artist B",
            "playcount": 7,
            "timestamp": (now - timedelta(minutes=10)).isoformat(),
        },
    ]

    mock_events_table = MagicMock()
    mock_events_table.scan.return_value = {"Items": items}

    with patch.object(api_main, "events_table", mock_events_table), patch.object(api_main, "trend_table", MagicMock()):
        result = api_main.trending_now()

    assert result[0]["track"] == "Song A"
    assert result[0]["artist"] == "Artist A"
    assert result[0]["play_count"] == 25
    assert len(result) == 1
