from kinesis_producer import send_event


def main():
    event = {
        "track": "Test Song",
        "artist": "Test Artist",
        "listeners": 100,
        "playcount": 500,
        "timestamp": "2026-07-30T20:00:00",
    }

    send_event(event)


if __name__ == "__main__":
    main()
