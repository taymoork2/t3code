# Tenetfold provider canary

This local preview plugin lets T3 Code own one influence decision before a Codex turn. It loads an explicitly configured staged Tenetfold module, synthesizes exactly one profile, records the accepted, rejected, or overridden configuration, and reports cancellation and terminal outcome evidence without receiving the user prompt or attachments.

Copy this directory to `<active-environment>/userdata/plugins/dev.tenetfold.provider-canary`, enable it, then set the absolute staged `cli.js` module path and an influence-request JSON value in plugin settings. The request execution path must name `surface.t3code.preview` as its integration owner and Codex as the inner harness.

If the plugin is absent, disabled, invalid, or fails, T3 Code logs the failure and continues with native Codex behavior. Receipt files are written only under the plugin-owned data directory.

This is a pinned preview canary, not a generic controller SDK or a distributed plugin.
