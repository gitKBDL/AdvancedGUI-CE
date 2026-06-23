import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetRegistry } from "./helpers";
import {
  deserializeColor,
  PluginParseError,
} from "./contract/pluginDeserializers";
import { componentTree } from "@/utils/manager/WorkspaceManager";
import { setInvisibleIDs } from "@/utils/manager/ComponentManager";
import { settings } from "@/utils/manager/SettingsManager";
import { Rect } from "@/utils/components/Rect";
import { GroupComponent } from "@/utils/components/GroupComponent";
import {
  buildSyncPayload,
  buildSyncCommand,
  syncLayoutName,
  syncUrlBlockReason,
} from "@/utils/manager/SyncManager";
import { BK } from "@/utils/handler/ProjectSerializationHandler";

/**
 * Guards the live-sync wire contract: buildSyncPayload() must produce exactly
 * what the plugin's LayoutManager.syncFromJson expects —
 *   { name, componentTree: <stringified finalized GroupComponent>, invisible[] }
 * with the finalized tree being parseable by the plugin's deserializers.
 */
describe("live-sync payload contract", () => {
  beforeEach(() => {
    resetRegistry();
    settings.projectName = "My GUI";
  });

  function seedLayout() {
    const child = new Rect(
      "box1",
      "Box",
      [],
      10,
      20,
      80,
      40,
      "rgba(255,136,0,1)",
      4,
    );
    const group = new GroupComponent("grp1", "Group", [], [new Rect(
      "box2",
      "Box2",
      [],
      0,
      0,
      10,
      10,
      "rgba(1,2,3,1)",
      0,
    )], true);
    componentTree.value = [child, group];
  }

  it("uses the normalized project name as the layout name", () => {
    settings.projectName = "  Spaced  Name  ";
    expect(syncLayoutName()).toBe(buildSyncPayload().name);
    expect(buildSyncPayload().name.length).toBeGreaterThan(0);
  });

  it("emits componentTree as a stringified finalized GroupComponent", () => {
    seedLayout();
    const payload = buildSyncPayload();

    // Double-encoding: componentTree is a STRING (plugin does .asText() then re-parses).
    expect(typeof payload.componentTree).toBe("string");

    const tree = JSON.parse(payload.componentTree);
    expect(tree.type).toBe("Group");
    expect(Array.isArray(tree.components)).toBe(true);
    // The synthetic root carries both top-level components, nested group preserved.
    expect(tree.components).toHaveLength(2);
    const nested = tree.components.find(
      (c: { type: string }) => c.type === "Group",
    );
    expect(nested.components).toHaveLength(1);
  });

  it("produces colors the plugin ColorDeserializer accepts", () => {
    seedLayout();
    const tree = JSON.parse(buildSyncPayload().componentTree);
    const rect = tree.components.find(
      (c: { type: string }) => c.type === "Rect",
    );
    expect(() => deserializeColor(rect.color)).not.toThrow(PluginParseError);
    expect(deserializeColor(rect.color)).toEqual({ r: 255, g: 136, b: 0, a: 255 });
  });

  it("passes invisible ids through as an independent copy", () => {
    seedLayout();
    setInvisibleIDs(["box1", "box2"]);
    const payload = buildSyncPayload();
    expect(payload.invisible).toEqual(["box1", "box2"]);
    // Mutating the payload must not touch the live invisible list.
    payload.invisible.push("mutated");
    expect(buildSyncPayload().invisible).toEqual(["box1", "box2"]);
  });

  it("whole wire frame double-encodes componentTree once serialized", () => {
    seedLayout();
    const frame = JSON.stringify(buildSyncPayload());
    const parsed = JSON.parse(frame);
    expect(typeof parsed.componentTree).toBe("string"); // still a string after one parse
    expect(() => JSON.parse(parsed.componentTree)).not.toThrow(); // second parse = the tree
  });

  it("builds the /ag sync command with the persistent browser key", () => {
    settings.projectName = "Arena";
    expect(buildSyncCommand()).toBe(`/ag sync ${BK} Arena`);
  });
});

describe("live-sync mixed-content guard", () => {
  const realProto = Object.getOwnPropertyDescriptor(location, "protocol");

  afterEach(() => {
    if (realProto) Object.defineProperty(location, "protocol", realProto);
    vi.unstubAllGlobals();
  });

  function setProtocol(proto: string) {
    Object.defineProperty(location, "protocol", {
      value: proto,
      configurable: true,
    });
  }

  it("allows any target when the page is http", () => {
    setProtocol("http:");
    expect(syncUrlBlockReason("ws://192.168.1.50:27757")).toBeNull();
    expect(syncUrlBlockReason("ws://localhost:27757")).toBeNull();
  });

  it("from https: blocks ws:// to non-loopback, allows loopback + wss", () => {
    setProtocol("https:");
    expect(syncUrlBlockReason("ws://192.168.1.50:27757")).not.toBeNull();
    expect(syncUrlBlockReason("ws://example.com:27757")).not.toBeNull();
    expect(syncUrlBlockReason("ws://localhost:27757")).toBeNull();
    expect(syncUrlBlockReason("ws://127.0.0.1:27757")).toBeNull();
    expect(syncUrlBlockReason("wss://sync.example.com")).toBeNull();
  });
});
