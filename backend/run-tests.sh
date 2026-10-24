#!/bin/bash
# Mac/Linux: downloads the SQLite driver, compiles the backend and runs all backend tests.
# Needs a JDK (Java 17+). Run from the backend folder:  bash run-tests.sh
set -e
cd "$(dirname "$0")"

command -v javac >/dev/null || { echo "javac not found. Install a JDK (Java 17 or newer) first."; exit 1; }

# 1. Download the two driver jars into lib/ (only if missing)
mkdir -p lib
[ -f lib/sqlite-jdbc.jar ] || curl -fsSL -o lib/sqlite-jdbc.jar https://repo1.maven.org/maven2/org/xerial/sqlite-jdbc/3.46.1.3/sqlite-jdbc-3.46.1.3.jar
[ -f lib/slf4j-api.jar ]   || curl -fsSL -o lib/slf4j-api.jar   https://repo1.maven.org/maven2/org/slf4j/slf4j-api/2.0.13/slf4j-api-2.0.13.jar

# 2. Compile
rm -rf out && mkdir out
javac -d out src/*.java test/ApiTest.java

# 3. Tests: in-memory store, then the real SQLite store
echo; echo "=== Tests with in-memory data ==="
java -cp out ApiTest
echo; echo "=== Tests with SQLite ==="
java -cp "out:lib/*" ApiTest sqlite
