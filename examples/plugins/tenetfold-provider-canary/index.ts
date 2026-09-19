import type {
  PluginActivate,
  PluginCommandContext,
  PluginCommandResult,
  PluginJson,
} from "t3/plugin";

const COMMAND_ID = "dev.tenetfold.provider-invocation";
const MODULE_SETTING = "dev.tenetfold.provider-canary.module-path";
const REQUEST_SETTING = "dev.tenetfold.provider-canary.request-json";
const DISPOSITION_SETTING = "dev.tenetfold.provider-canary.disposition";
const OVERRIDE_SETTING = "dev.tenetfold.provider-canary.override-json";

type JsonObject = { readonly [key: string]: PluginJson };

interface TenetfoldCandidate {
  readonly synthesizeInfluenceProfile: (request: unknown) => {
    readonly profileId: string;
    readonly contentDigest: { readonly algorithm: "sha256"; readonly value: string };
    readonly executionPath: { readonly invocationId: string };
  };
  readonly materializeInfluenceProfile: (
    profile: unknown,
    decision: unknown,
  ) => { readonly configuration: unknown };
  readonly translateConfigurationForCodex: (configuration: unknown) => {
    readonly model: string | null;
    readonly reasoningEffort: string | null;
    readonly developerInstructions: string | null;
    readonly requestedConfiguration: JsonObject;
    readonly materializedConfiguration: JsonObject;
  };
}

function object(value: PluginJson | undefined): JsonObject {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Tenetfold provider invocation requires object data.");
  }
  return value as JsonObject;
}

function text(value: PluginJson | undefined, setting: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Tenetfold provider canary setting ${setting} is required.`);
  }
  return value;
}

const activate = ((api) => {
  api.registerUi({
    settings: [
      {
        id: MODULE_SETTING,
        kind: "text",
        label: "Tenetfold candidate module",
        description: "Absolute path to the staged Tenetfold cli.js module.",
        defaultValue: "",
        surfaces: ["web", "desktop"],
      },
      {
        id: REQUEST_SETTING,
        kind: "text",
        label: "Tenetfold influence request",
        description: "JSON request used by the bounded canary.",
        defaultValue: "",
        surfaces: ["web", "desktop"],
      },
      {
        id: DISPOSITION_SETTING,
        kind: "select",
        label: "Tenetfold disposition",
        defaultValue: "accept",
        options: [
          { label: "Accept", value: "accept" },
          { label: "Reject", value: "reject" },
          { label: "Override", value: "override" },
        ],
        surfaces: ["web", "desktop"],
      },
      {
        id: OVERRIDE_SETTING,
        kind: "text",
        label: "Tenetfold override",
        description: "JSON override used only when the disposition is override.",
        defaultValue: "null",
        surfaces: ["web", "desktop"],
      },
    ],
    navigation: [],
    views: [],
    cards: [],
    statusItems: [],
    composerActions: [],
    contextualActions: [],
  });

  api.registerCommand(
    {
      id: COMMAND_ID,
      label: "Tenetfold provider invocation",
      description: "Apply one bounded Tenetfold influence profile to a Codex turn.",
      surfaces: [],
    },
    (context?: PluginCommandContext) => {
      const data = object(context?.data);
      const phase = data.phase;
      if (phase === "after" || phase === "cancel") {
        const result = {
          message: `Tenetfold ${phase} evidence recorded.`,
          tone: "success" as const,
          data: { phase },
        } satisfies PluginCommandResult;
        return api.effect.map(
          api.host.files.writeText(`last-${phase}.json`, `${JSON.stringify(data)}\n`),
          () => result,
        );
      }
      if (phase !== "before" || context?.threadId === undefined) {
        throw new Error("Tenetfold provider invocation requires a before phase and thread id.");
      }

      return api.effect.flatMap(api.host.settings.get(MODULE_SETTING), (moduleSetting) =>
        api.effect.flatMap(api.host.settings.get(REQUEST_SETTING), (requestSetting) =>
          api.effect.flatMap(api.host.settings.get(DISPOSITION_SETTING), (dispositionSetting) =>
            api.effect.flatMap(api.host.settings.get(OVERRIDE_SETTING), async (overrideSetting) => {
              const modulePath = text(moduleSetting, MODULE_SETTING);
              const request = JSON.parse(text(requestSetting, REQUEST_SETTING)) as unknown;
              const disposition = text(dispositionSetting ?? "accept", DISPOSITION_SETTING);
              if (!(["accept", "reject", "override"] as const).includes(disposition as never)) {
                throw new Error(`Unsupported Tenetfold disposition ${disposition}.`);
              }
              const override =
                disposition === "override"
                  ? (JSON.parse(text(overrideSetting, OVERRIDE_SETTING)) as unknown)
                  : null;
              const candidate = (await import(modulePath)) as TenetfoldCandidate;
              const profile = candidate.synthesizeInfluenceProfile(request);
              const materialization = candidate.materializeInfluenceProfile(profile, {
                schemaVersion: 2,
                adapterId: "codex",
                integrationOwnerId: "surface.t3code.preview",
                disposition,
                target: {
                  kind: "interactive",
                  taskId: context.threadId,
                  runId: profile.executionPath.invocationId,
                },
                persistence: { kind: "runtime-only" },
                override,
              });
              const translation = candidate.translateConfigurationForCodex(
                materialization.configuration,
              );
              return {
                message: `Tenetfold profile ${disposition}.`,
                tone: "success" as const,
                data: {
                  schemaVersion: 1,
                  phase: "before",
                  disposition,
                  integrationOwnerId: "surface.t3code.preview",
                  profileId: profile.profileId,
                  profileDigest: profile.contentDigest,
                  translation,
                },
              } satisfies PluginCommandResult;
            }),
          ),
        ),
      );
    },
  );
}) satisfies PluginActivate;

export default activate;
