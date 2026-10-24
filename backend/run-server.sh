#!/bin/bash
# Mac/Linux: starts the API with the SQLite file inventory.db (run run-tests.sh first).
cd "$(dirname "$0")"
java -cp "out:lib/*" ApiServer
