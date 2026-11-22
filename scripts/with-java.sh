#!/usr/bin/env bash
# Los emuladores de Firebase necesitan JDK 21+. Si está instalado con Homebrew (keg-only), lo usamos.
for candidate in /opt/homebrew/opt/openjdk@21/bin /usr/local/opt/openjdk@21/bin; do
  if [ -x "$candidate/java" ]; then export PATH="$candidate:$PATH"; break; fi
done
exec "$@"
