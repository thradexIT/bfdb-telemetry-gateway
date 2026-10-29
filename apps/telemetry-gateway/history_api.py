import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from urllib.parse import parse_qs, urlparse

WINDOWS = {
    "24h": ("24 hours", "5 minutes"),
    "7d": ("7 days", "30 minutes"),
    "15d": ("15 days", "1 hour"),
    "1M": ("30 days", "2 hours"),
}


def parse_history_query(path):
    parsed = urlparse(path)
    if parsed.path != "/history":
        return None

    query = parse_qs(parsed.query)
    serial = (query.get("serial", [""])[0] or "").strip()
    window = (query.get("window", ["24h"])[0] or "24h").strip()
    raw_points = [value for value in query.get("rawPointId", []) if value]

    if not serial:
        raise ValueError("serial is required")
    if window not in WINDOWS:
        raise ValueError("unsupported window")
    if len(raw_points) > 96:
        raise ValueError("too many rawPointId filters")

    return {
        "serial": serial,
        "window": window,
        "raw_point_ids": raw_points,
    }


class HistoryRequestHandler(BaseHTTPRequestHandler):
    repository = None

    def _json(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            self._json(HTTPStatus.OK, {"status": "ok"})
            return

        try:
            query = parse_history_query(self.path)
        except ValueError as exc:
            self._json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return

        if query is None:
            self._json(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        interval, bucket = WINDOWS[query["window"]]
        rows = self.repository.query_history(
            serial=query["serial"],
            interval=interval,
            bucket=bucket,
            raw_point_ids=query["raw_point_ids"],
        )
        self._json(
            HTTPStatus.OK,
            {
                "serial": query["serial"],
                "window": query["window"],
                "points": rows,
            },
        )

    def log_message(self, format, *args):
        return


def start_history_server(repository, host, port):
    HistoryRequestHandler.repository = repository
    server = ThreadingHTTPServer((host, port), HistoryRequestHandler)
    thread = Thread(target=server.serve_forever, name="history-api", daemon=True)
    thread.start()
    print(f"HISTORY_API_READY host={host} port={port}", flush=True)
    return server
