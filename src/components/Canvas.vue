<template>
  <div
    id="canvasPadding"
    @mousedown.prevent="onClickDown"
    @mouseup="onClickUp"
    @mousemove="onMove"
    @mouseleave="onClickUp"
  >
    <canvas ref="canvas" id="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { Point } from "@/utils/Point";
import { ResizeIcon, Modifier, moveModifier } from "@/utils/Modifier";
import { Component } from "@/utils/components/Component";
import {
  isInvisible,
  invisibleIDs,
  components as registeredComponents,
  isComponentLocked,
  traverseComponent,
  getParentComponent,
} from "@/utils/manager/ComponentManager";
import { drawSelection, getHanderAt } from "@/utils/Selection";
import { BoundingBox } from "@/utils/BoundingBox";
import { images, regImages } from "@/utils/manager/ImageManager";
import { ListItemGroup } from "../utils/ListItem";
import { settings } from "../utils/manager/SettingsManager";
import {
  componentTree,
  devMode,
  pauseRendering,
  selection,
  updateSelection,
} from "../utils/manager/WorkspaceManager";
import { unsavedChange, updateHistory } from "../utils/manager/HistoryManager";
import { vueRef } from "../utils/VueRef";
import { updateCurrentThumbnail } from "../utils/manager/ProjectManager";

let redrawFunction: (() => void) | null = null;

export function requestRedraw() {
  if (redrawFunction) redrawFunction();
}

export default defineComponent({
  data() {
    return {
      mouseDownTime: Date.now(),

      modifying: null as null | {
        modifier: Modifier;
        icon: ResizeIcon | "move";
        startPosition: Point;
        elementStartPosition: BoundingBox;
        singleAxis: boolean;
        component: Component;
        duplicateOnMove: boolean;
        duplicated: boolean;
      },

      invisibleIDs: vueRef(invisibleIDs),
      selection: vueRef(selection),
      unsavedChange: vueRef(unsavedChange),
      settings,
      componentTree: vueRef(componentTree),
      registeredComponents,
      images,
      regImages,
      pauseRendering: vueRef(pauseRendering),

      devMode: vueRef(devMode),
      lastMove: Date.now(),
      lastSnap: Date.now() - 1000 * 12,
      snapGuides: {
        x: [] as number[],
        y: [] as number[],
      },
      spacingGuides: [] as {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        label: string;
        axis: "x" | "y";
      }[],
    };
  },

  mounted() {
    this.adjustHeight();

    redrawFunction = this.redraw;

    const canvas = (this.$refs.canvas as HTMLCanvasElement).getContext(
      "2d",
    ) as CanvasRenderingContext2D;

    canvas.imageSmoothingEnabled = false;

    this.redraw();
  },

  unmounted() {
    redrawFunction = null;
  },

  computed: {
    height(): number {
      return this.settings.height * 128;
    },

    width(): number {
      return this.settings.width * 128;
    },
  },

  watch: {
    unsavedChange() {
      this.lastSnap = 0;
      this.redraw();
    },

    selection: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    componentTree: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    regImages: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    "settings.zoom"() {
      this.adjustHeight();
    },

    "settings.height"() {
      this.adjustHeight();
      setTimeout(this.redraw, 10);
    },

    "settings.width"() {
      setTimeout(this.redraw, 10);
    },
    "settings.snapEnabled"() {
      if (!this.settings.snapEnabled) {
        this.snapGuides.x = [];
        this.snapGuides.y = [];
      }
    },

    registeredComponents() {
      if (
        this.selection?.component &&
        !this.registeredComponents[this.selection?.component.id]
      )
        updateSelection({ value: null });

      this.redraw();
    },

    invisibleIDs: {
      deep: true,
      handler() {
        this.redraw();
      },
    },

    pauseRendering() {
      this.redraw();
    },

    devMode: {
      handler() {
        this.redraw();
      },
    },
  },

  methods: {
    adjustHeight() {
      (this.$refs.canvas as HTMLElement).style.height = `${
        this.height * this.settings.zoom
      }px`;
    },

    redraw() {
      if (this.pauseRendering) return;

      const canvas = (this.$refs.canvas as HTMLCanvasElement).getContext("2d", {
        alpha: false,
      }) as CanvasRenderingContext2D;

      canvas.clearRect(0, 0, this.width, this.height);

      for (let i = this.componentTree.length - 1; i >= 0; i--) {
        const element = this.componentTree[i];
        if (!isInvisible(element.id)) element.draw(canvas);
      }

      if (Date.now() - this.lastSnap > 1000 * 15) {
        try {
          updateCurrentThumbnail(
            (this.$refs.canvas as HTMLCanvasElement).toDataURL(),
          );
        } catch {
          // Remote images without CORS can taint the canvas, skip thumbnails.
        }

        this.lastSnap = Date.now();
      }

      if (
        this.selection?.component &&
        this.registeredComponents[this.selection?.component.id]
      )
        drawSelection(canvas, this.selection?.component);

      if (this.snapGuides.x.length || this.snapGuides.y.length) {
        canvas.save();
        canvas.strokeStyle = "rgba(76, 195, 255, 0.7)";
        canvas.lineWidth = 1;
        canvas.setLineDash([4, 6]);

        this.snapGuides.x.forEach((lineX) => {
          const x = Math.round(lineX) + 0.5;
          canvas.beginPath();
          canvas.moveTo(x, 0);
          canvas.lineTo(x, this.height);
          canvas.stroke();
        });

        this.snapGuides.y.forEach((lineY) => {
          const y = Math.round(lineY) + 0.5;
          canvas.beginPath();
          canvas.moveTo(0, y);
          canvas.lineTo(this.width, y);
          canvas.stroke();
        });

        canvas.restore();
      }

      if (this.spacingGuides.length) {
        canvas.save();
        canvas.strokeStyle = "rgba(255, 192, 92, 0.85)";
        canvas.fillStyle = "rgba(255, 192, 92, 0.95)";
        canvas.lineWidth = 1;
        canvas.setLineDash([2, 4]);
        canvas.font = "12px VT323, monospace";
        canvas.textAlign = "center";
        canvas.textBaseline = "middle";

        const tick = 4;

        this.spacingGuides.forEach((guide) => {
          canvas.beginPath();
          canvas.moveTo(guide.x1, guide.y1);
          canvas.lineTo(guide.x2, guide.y2);
          canvas.stroke();

          if (guide.axis === "x") {
            canvas.beginPath();
            canvas.moveTo(guide.x1, guide.y1 - tick);
            canvas.lineTo(guide.x1, guide.y1 + tick);
            canvas.moveTo(guide.x2, guide.y2 - tick);
            canvas.lineTo(guide.x2, guide.y2 + tick);
            canvas.stroke();
          } else {
            canvas.beginPath();
            canvas.moveTo(guide.x1 - tick, guide.y1);
            canvas.lineTo(guide.x1 + tick, guide.y1);
            canvas.moveTo(guide.x2 - tick, guide.y2);
            canvas.lineTo(guide.x2 + tick, guide.y2);
            canvas.stroke();
          }

          const midX = (guide.x1 + guide.x2) / 2;
          const midY = (guide.y1 + guide.y2) / 2;
          const label = `${guide.label}px`;
          const width = canvas.measureText(label).width;
          const padding = 4;
          const boxHeight = 14;

          canvas.fillStyle = "rgba(20, 26, 35, 0.85)";
          canvas.fillRect(
            midX - width / 2 - padding,
            midY - boxHeight / 2,
            width + padding * 2,
            boxHeight,
          );

          canvas.fillStyle = "rgba(255, 192, 92, 0.95)";
          canvas.fillText(label, midX, midY);
        });

        canvas.restore();
      }

      if (this.devMode) {
        canvas.strokeStyle = "rgba(255,255,255,0.3)";
        canvas.setLineDash([]);
        canvas.lineWidth = 1;
        canvas.beginPath();
        for (let lineX = 128; lineX < this.width; lineX += 128) {
          canvas.moveTo(lineX - 0.5, 0);
          canvas.lineTo(lineX - 0.5, this.height);
        }
        for (let lineY = 128; lineY < this.height; lineY += 128) {
          canvas.moveTo(0, lineY - 0.5);
          canvas.lineTo(this.width, lineY - 0.5);
        }
        canvas.stroke();
      }
    },

    getLowestCommonParents(
      comp: Component,
      targetId: string,
      point: Point,
    ): (ListItemGroup<Component> & Component) | undefined {
      if (comp.isGroup()) {
        if (comp.getItems().some((c) => c.id == targetId)) return comp;
        else
          return comp
            .getItems()
            .filter((c) => c.getBoundingBox().isInside(point))
            .map((c) => this.getLowestCommonParents(c, targetId, point))
            .find((c) => !!c);
      }

      return undefined;
    },

    getParentList(component: Component): Component[] | undefined {
      if (componentTree.value.some((c) => c.id == component.id)) {
        return componentTree.value;
      }
      return getParentComponent(component)?.getItems();
    },

    duplicateComponentForMove(component: Component): Component | null {
      const parent = this.getParentList(component);
      if (!parent) return null;

      const index = parent.findIndex((c) => c.id == component.id);
      const duplicate = component.duplicate() as Component | null;
      if (!duplicate) return null;

      parent.splice(index === -1 ? 0 : index, 0, duplicate);
      updateSelection({ value: duplicate });
      return duplicate;
    },

    onClickDown(event: MouseEvent) {
      this.clearGuides();
      const point = this.getCursorPosition(event);
      const handler = getHanderAt(point);
      let hovered = this.getElementAt(point);

      if (!handler) {
        if (
          this.selection?.component &&
          this.selection?.component.getBoundingBox().isInside(point)
        )
          this.mouseDownTime = Date.now();

        // Check for change of selection
        if (
          hovered &&
          (!this.selection?.component ||
            !this.selection?.component.getBoundingBox().isInside(point))
        ) {
          // If there is already an element selected, then the new selection will try to be as low as possible
          // in the component tree towards the current selection. e.g.: it will try to select sibilings within the parent
          if (this.selection?.component) {
            const commonParent = this.getLowestCommonParents(
              hovered,
              this.selection?.component.id,
              point,
            );
            const sibling = commonParent
              ?.getItems()
              ?.find((c) => c.getBoundingBox().isInside(point));

            if (sibling) hovered = sibling;
            else if (commonParent) hovered = commonParent;
          }

          updateSelection({ value: hovered });
        }

        if (!hovered) updateSelection({ value: null });
      }

      const selectedComponent = this.selection?.component;
      if (selectedComponent) {
        if (isComponentLocked(selectedComponent)) {
          this.redraw();
          return;
        }
        let modifier;
        let modifierIcon: ResizeIcon | "move" = "move";
        let singleAxis = false;
        if (handler) {
          modifier = handler.modifier;
          modifierIcon = handler.icon;
          singleAxis = handler.singleAxisAction;
        } else if (selectedComponent.getBoundingBox().isInside(point)) {
          this.setCursor("move");
          modifier = moveModifier;
        }

        if (modifier && modifierIcon !== undefined) {
          this.modifying = {
            startPosition: point,
            icon: modifierIcon,
            elementStartPosition: selectedComponent.getBoundingBox(),
            modifier,
            singleAxis,
            component: selectedComponent,
            duplicateOnMove: event.altKey,
            duplicated: false,
          };

          if (modifierIcon !== "move") {
            this.modifying.component.startResize(
              this.modifying.elementStartPosition,
            );
          }
        }
      }

      this.redraw();
    },

    onClickUp(event: MouseEvent) {
      this.clearGuides();
      const point = this.getCursorPosition(event);
      const hovered = this.getElementAt(point);

      if (Date.now() - this.mouseDownTime < 200) {
        if (this.selection?.component) {
          if (
            hovered &&
            this.containsComponentAtPoint(
              hovered,
              this.selection?.component,
              point,
            )
          )
            updateSelection({
              value: this.selection?.component.refineSelection(point),
            });
          else updateSelection({ value: hovered! });
        }
      }

      this.redraw();
      updateHistory();

      if (this.modifying) {
        this.modifying.component.endResize();
      }

      this.modifying = null;
    },

    getElementAt(point: Point) {
      return this.componentTree.find((element) =>
        element.getBoundingBox().isInside(point),
      );
    },

    containsComponentAtPoint(
      comp: Component,
      find: Component,
      point: Point,
    ): boolean {
      let lastFound = comp;

      do {
        if (lastFound == find) return true;
        comp = lastFound;
        lastFound = comp.refineSelection(point);
      } while (lastFound != comp);

      return lastFound == find;
    },

    setCursor(style: "move" | "default" | "pointer" | "move" | ResizeIcon) {
      (this.$refs.canvas as HTMLElement).style.cursor = style;
    },

    onMove(event: MouseEvent) {
      if (this.modifying && Date.now() <= this.lastMove + 20) return;

      this.lastMove = Date.now();

      const point = this.getCursorPosition(event);
      const hovered = this.getElementAt(point);

      if (this.modifying) {
        if (isComponentLocked(this.modifying.component)) {
          this.setCursor("default");
          return;
        }
        this.setCursor(this.modifying.icon);

        const xOff = point.x - this.modifying.startPosition.x;
        const yOff = point.y - this.modifying.startPosition.y;

        let newBounds = this.modifying.modifier(
          new Point(xOff, yOff),
          this.modifying.elementStartPosition,
        );

        if (this.modifying.icon === "move") {
          if (
            this.modifying.duplicateOnMove &&
            !this.modifying.duplicated &&
            event.altKey
          ) {
            const duplicate = this.duplicateComponentForMove(
              this.modifying.component,
            );
            if (duplicate) {
              this.modifying.component = duplicate;
              this.modifying.elementStartPosition = duplicate.getBoundingBox();
              this.modifying.duplicated = true;
            }
          }
          newBounds = this.applySnapping(newBounds, this.modifying.component);
          newBounds.ensureBounds(this.width, this.height);
          this.updateSpacingGuides(newBounds, this.modifying.component);
        } else {
          this.clearGuides();
          newBounds.ensureBounds(this.width, this.height);
        }

        this.modifying.component.modify(newBounds, this.modifying.singleAxis);
      } else {
        this.clearGuides();
        const handler = getHanderAt(point);
        if (
          handler &&
          this.selection?.component &&
          !isComponentLocked(this.selection.component)
        ) {
          this.setCursor(handler.icon);
        } else if (hovered) {
          if (
            hovered == this.selection?.component ||
            this.selection?.component?.getBoundingBox().isInside(point)
          ) {
            this.setCursor(
              this.selection?.component &&
                isComponentLocked(this.selection.component)
                ? "default"
                : "move",
            );
          } else this.setCursor("pointer");
        } else {
          this.setCursor("default");
        }
      }
    },

    clearGuides() {
      if (this.snapGuides.x.length || this.snapGuides.y.length) {
        this.snapGuides.x = [];
        this.snapGuides.y = [];
      }
      if (this.spacingGuides.length) {
        this.spacingGuides = [];
      }
    },

    collectSnapTargets(exclude: Component) {
      const xTargets = new Set<number>();
      const yTargets = new Set<number>();
      const gridSize = 128;

      xTargets.add(0);
      xTargets.add(this.width / 2);
      xTargets.add(this.width);
      yTargets.add(0);
      yTargets.add(this.height / 2);
      yTargets.add(this.height);

      for (let x = 0; x <= this.width; x += gridSize) xTargets.add(x);
      for (let y = 0; y <= this.height; y += gridSize) yTargets.add(y);

      this.componentTree.forEach((root) =>
        traverseComponent(root, (comp) => {
          if (exclude.contains(comp.id)) return;
          if (isInvisible(comp.id)) return;
          const box = comp.getBoundingBox();
          if (box === BoundingBox.EMPTY) return;
          if (box.width <= 0 || box.height <= 0) return;

          xTargets.add(box.x);
          xTargets.add(box.x + box.width / 2);
          xTargets.add(box.x + box.width);

          yTargets.add(box.y);
          yTargets.add(box.y + box.height / 2);
          yTargets.add(box.y + box.height);
        }),
      );

      return {
        x: Array.from(xTargets),
        y: Array.from(yTargets),
      };
    },

    collectSpacingTargets(exclude: Component): BoundingBox[] {
      const boxes: BoundingBox[] = [];

      this.componentTree.forEach((root) =>
        traverseComponent(root, (comp) => {
          if (exclude.contains(comp.id)) return;
          if (isInvisible(comp.id)) return;
          const box = comp.getBoundingBox();
          if (box === BoundingBox.EMPTY) return;
          if (box.width <= 0 || box.height <= 0) return;
          boxes.push(box);
        }),
      );

      return boxes;
    },

    applySnapping(bounds: BoundingBox, component: Component) {
      if (!this.settings.snapEnabled) {
        if (this.snapGuides.x.length || this.snapGuides.y.length) {
          this.snapGuides.x = [];
          this.snapGuides.y = [];
        }
        return bounds;
      }

      const snapThreshold = 6;
      const { x: xTargets, y: yTargets } = this.collectSnapTargets(component);
      let snappedX: { diff: number; line: number } | null = null;
      let snappedY: { diff: number; line: number } | null = null;

      const xAnchors = [
        bounds.x,
        bounds.x + bounds.width / 2,
        bounds.x + bounds.width,
      ];
      const yAnchors = [
        bounds.y,
        bounds.y + bounds.height / 2,
        bounds.y + bounds.height,
      ];

      for (const line of xTargets) {
        for (const anchor of xAnchors) {
          const diff = line - anchor;
          const dist = Math.abs(diff);
          if (dist <= snapThreshold) {
            if (!snappedX || dist < Math.abs(snappedX.diff)) {
              snappedX = { diff, line };
            }
          }
        }
      }

      for (const line of yTargets) {
        for (const anchor of yAnchors) {
          const diff = line - anchor;
          const dist = Math.abs(diff);
          if (dist <= snapThreshold) {
            if (!snappedY || dist < Math.abs(snappedY.diff)) {
              snappedY = { diff, line };
            }
          }
        }
      }

      if (snappedX) {
        bounds.x += snappedX.diff;
        this.snapGuides.x = [snappedX.line];
      } else {
        this.snapGuides.x = [];
      }

      if (snappedY) {
        bounds.y += snappedY.diff;
        this.snapGuides.y = [snappedY.line];
      } else {
        this.snapGuides.y = [];
      }

      return bounds;
    },

    updateSpacingGuides(bounds: BoundingBox, component: Component) {
      const targets = this.collectSpacingTargets(component);
      const guides: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        label: string;
        axis: "x" | "y";
      }[] = [];

      const overlapY = (a: BoundingBox, b: BoundingBox) =>
        Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      const overlapX = (a: BoundingBox, b: BoundingBox) =>
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);

      type SpacingGuideX = { dist: number; lineY: number; edgeX: number };
      type SpacingGuideY = { dist: number; lineX: number; edgeY: number };

      let left: SpacingGuideX | null = null;
      let right: SpacingGuideX | null = null;
      let top: SpacingGuideY | null = null;
      let bottom: SpacingGuideY | null = null;

      for (const box of targets) {
        const yOverlap = overlapY(bounds, box);
        if (yOverlap > 0) {
          const overlapStart = Math.max(bounds.y, box.y);
          const overlapEnd = Math.min(
            bounds.y + bounds.height,
            box.y + box.height,
          );
          const lineY = (overlapStart + overlapEnd) / 2;
          if (box.x + box.width <= bounds.x) {
            const dist = bounds.x - (box.x + box.width);
            if (!left || dist < left.dist) {
              left = {
                dist,
                lineY,
                edgeX: box.x + box.width,
              };
            }
          }

          if (box.x >= bounds.x + bounds.width) {
            const dist = box.x - (bounds.x + bounds.width);
            if (!right || dist < right.dist) {
              right = {
                dist,
                lineY,
                edgeX: box.x,
              };
            }
          }
        }

        const xOverlap = overlapX(bounds, box);
        if (xOverlap > 0) {
          const overlapStart = Math.max(bounds.x, box.x);
          const overlapEnd = Math.min(
            bounds.x + bounds.width,
            box.x + box.width,
          );
          const lineX = (overlapStart + overlapEnd) / 2;
          if (box.y + box.height <= bounds.y) {
            const dist = bounds.y - (box.y + box.height);
            if (!top || dist < top.dist) {
              top = {
                dist,
                lineX,
                edgeY: box.y + box.height,
              };
            }
          }

          if (box.y >= bounds.y + bounds.height) {
            const dist = box.y - (bounds.y + bounds.height);
            if (!bottom || dist < bottom.dist) {
              bottom = {
                dist,
                lineX,
                edgeY: box.y,
              };
            }
          }
        }
      }

      if (left && left.dist > 0) {
        guides.push({
          x1: left.edgeX,
          y1: left.lineY,
          x2: bounds.x,
          y2: left.lineY,
          label: Math.round(left.dist).toString(),
          axis: "x",
        });
      }

      if (right && right.dist > 0) {
        guides.push({
          x1: bounds.x + bounds.width,
          y1: right.lineY,
          x2: right.edgeX,
          y2: right.lineY,
          label: Math.round(right.dist).toString(),
          axis: "x",
        });
      }

      if (top && top.dist > 0) {
        guides.push({
          x1: top.lineX,
          y1: top.edgeY,
          x2: top.lineX,
          y2: bounds.y,
          label: Math.round(top.dist).toString(),
          axis: "y",
        });
      }

      if (bottom && bottom.dist > 0) {
        guides.push({
          x1: bottom.lineX,
          y1: bounds.y + bounds.height,
          x2: bottom.lineX,
          y2: bottom.edgeY,
          label: Math.round(bottom.dist).toString(),
          axis: "y",
        });
      }

      this.spacingGuides = guides;
    },

    getCursorPosition(event: MouseEvent): Point {
      const rect = (this.$refs.canvas as HTMLElement).getBoundingClientRect();
      const x = Math.round(
        (event.clientX - rect.left) * (this.width / rect.width),
      );
      const y = Math.round(
        (event.clientY - rect.top) * (this.height / rect.height),
      );
      return new Point(x, y);
    },
  },
});
</script>

<style lang="scss" scoped></style>
