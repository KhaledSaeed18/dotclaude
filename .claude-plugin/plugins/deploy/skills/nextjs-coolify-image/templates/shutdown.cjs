"use strict";
/*
 * Exit promptly when the container is stopped. Next waits for in-flight
 * requests on SIGTERM, and a long-lived stream never ends, so the old
 * container would live until Docker killed it 30 s later while the proxy
 * kept sending it every other request (502s during a rolling update).
 * NEXT_MANUAL_SIG_HANDLE in the Dockerfile disables Next's own handler;
 * this one serves half a second more, then exits. Clients reconnect to
 * the new container on their own.
 */
const EXIT_DELAY_MS = 500;

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    setTimeout(() => process.exit(0), EXIT_DELAY_MS);
  });
}
