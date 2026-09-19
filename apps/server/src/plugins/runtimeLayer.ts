import * as Layer from "effect/Layer";

import * as PluginCommandCatalog from "./PluginCommandCatalog.ts";
import * as PluginHostCapabilityBroker from "./PluginHostCapabilityBroker.ts";
import * as PluginPackageManager from "./PluginPackageManager.ts";
import * as PluginWorkerSupervisor from "./PluginWorkerSupervisor.ts";

export const PluginRuntimeLayer = PluginPackageManager.layer.pipe(
  Layer.provideMerge(PluginCommandCatalog.layer),
  Layer.provideMerge(PluginHostCapabilityBroker.layer),
  Layer.provideMerge(PluginWorkerSupervisor.layer),
);
